// Módulo: Generative Rhythm Generator — rule-based probabilistic patterns that write notes
// with the SDK's NATIVE `probability` and `velocityDeviation` fields, so Live itself plays
// them non-deterministically. Robustified with a fill engine, auto-fills (fill_every), and a
// re-shuffle backed by the shared Edit History (undo here or globally).
import { history, recordNotes, keyClip } from "../../core/history.js";
export class ToolRegistry {
  private handlers = new Map();
  definitions: any[] = [];
  register(def: any, handler: any) { this.definitions.push(def); this.handlers.set(def.name, handler); }
  async execute(name: string, args: any, song: any) {
    const h = this.handlers.get(name);
    if (!h) return { success: false, error: `Unknown: ${name}` };
    try { return await h(args, song); }
    catch (err: any) { return { success: false, error: err.message || String(err) }; }
  }
  getDefinitionsJson() { return this.definitions; }
}

const LANES = [
  { name: "Kick", pitch: 36 },
  { name: "Snare", pitch: 38 },
  { name: "Hat", pitch: 42 },
];
const G = 0.25; // 1/16 step in beats

function barRules(density: number, mutate: number) {
  const d = Math.max(0, Math.min(1, density / 100));
  const lanes = LANES.map((l) => ({ name: l.name, pitch: l.pitch, steps: new Array(16).fill(0) as number[] }));
  for (let s = 0; s < 16; s++) {
    if (s % 8 === 0) lanes[0].steps[s] = 1;
    else if (s % 4 === 0 && Math.random() < 0.4 + d * 0.4) lanes[0].steps[s] = 0.6 + d * 0.3;
    else if (Math.random() < d * 0.18 + mutate * 0.1) lanes[0].steps[s] = 0.35;
    if (s === 4 || s === 12) lanes[1].steps[s] = 1;
    else if (Math.random() < d * 0.2) lanes[1].steps[s] = 0.4 + Math.random() * 0.3;
    if (Math.random() < 0.35 + d * 0.6) lanes[2].steps[s] = s % 2 === 0 ? 0.8 + d * 0.2 : 0.45 + d * 0.3;
  }
  return lanes;
}

// Fill engine: a roll over `beats` starting at `startBeat`, with a velocity crescendo and
// density that grows with intensity. style picks the voices (snare / tom roll / mixed).
function buildFill(startBeat: number, beats: number, style: string, intensity: number) {
  const inten = Math.max(0, Math.min(1, intensity / 100));
  const sub = beats <= 1 ? 0.125 : 0.25; // 1/32 for tight fills, 1/16 for longer ones
  const steps = Math.max(2, Math.round(beats / sub));
  const voices = style === "tom" ? [50, 48, 47, 45] : style === "mixed" ? [38, 47, 45] : [38];
  const notes: any[] = [];
  for (let i = 0; i < steps; i++) {
    const frac = i / (steps - 1 || 1);
    if (i < steps * 0.35 && Math.random() > 0.4 + inten * 0.55) continue; // sparser at the start
    const vel = Math.round(72 + frac * 48); // crescendo 72 → 120
    const pitch = voices[Math.min(voices.length - 1, Math.floor(frac * voices.length))];
    notes.push({ pitch, startTime: startBeat + i * sub, duration: sub * 0.9, velocity: Math.min(127, vel), velocityDeviation: 6 });
  }
  return notes;
}

function buildPattern(bars: number, baseDensity: number, vDev: number, evolve: boolean, fillEvery: number) {
  const notes: any[] = [];
  const lanesOut: any[] = LANES.map((l) => ({ name: l.name, pitch: l.pitch, steps: [] as any[] }));
  let fills = 0;
  for (let b = 0; b < bars; b++) {
    const density = evolve ? Math.max(10, Math.min(95, baseDensity + (b - bars / 2) * 12 + (Math.random() - 0.5) * 14)) : baseDensity;
    const lanes = barRules(density, evolve ? b / bars : 0);
    const fillBar = fillEvery > 0 && (b + 1) % fillEvery === 0;
    lanes.forEach((lane, li) => {
      for (let s = 0; s < 16; s++) {
        const inFillWindow = fillBar && s >= 12; // last beat becomes the fill
        const p = inFillWindow ? 0 : lane.steps[s];
        lanesOut[li].steps.push({ on: p > 0, prob: Number(p.toFixed(2)) });
        if (p > 0) {
          const vel = lane.name === "Hat" ? 70 + p * 30 : 95 + p * 25;
          notes.push({ pitch: lane.pitch, startTime: (b * 16 + s) * G, duration: G * 0.9, velocity: Math.min(127, Math.round(vel)), probability: Math.max(0.05, Math.min(1, p)), velocityDeviation: vDev });
        }
      }
    });
    if (fillBar) { notes.push(...buildFill((b * 16 + 12) * G, 1, "mixed", density)); fills++; }
  }
  return { notes, lanesOut, fills };
}

function getClip(song: any, ti: number, ci: number) { const t = song?.tracks?.[ti]; return t?.clipSlots?.[ci ?? 0]?.clip ?? t?.arrangementClips?.[ci ?? 0]; }
function clipSpanBeats(clip: any) { const ns = clip.notes || []; return ns.length ? Math.max(4, ...ns.map((n: any) => n.startTime + (n.duration || 0))) : (clip.duration || 4); }

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"generate", description:"Generate a generative drum pattern using native note probability + velocity deviation, with optional auto-fills", category:"generative", parameters:{ bars:{type:"number",description:"Number of bars (default 2)",required:false}, density:{type:"number",description:"Overall density 0-100 (default 55)",required:false}, evolve:{type:"boolean",description:"Mutate density bar-by-bar",required:false}, humanize:{type:"number",description:"Velocity deviation 0-40 (default 14)",required:false}, fill_every:{type:"number",description:"Insert a fill on the last beat of every Nth bar (0 = off)",required:false}, track_index:{type:"number",description:"Existing track (omit = new)",required:false} } },
    async (args: any, song: any) => {
      const bars = Math.max(1, Math.min(8, args.bars || 2));
      const baseDensity = args.density ?? 55;
      const vDev = args.humanize ?? 14;
      const fillEvery = Math.max(0, Math.min(8, args.fill_every || 0));
      const trackIdx = args.track_index;
      const track = trackIdx != null ? song.tracks[trackIdx] : await song.createMidiTrack();
      if (trackIdx == null) track.name = `Generative ${baseDensity}%`;
      const clip = await track.createMidiClip(0, bars * 4);
      clip.name = `Generative ${bars}b`;
      const { notes, lanesOut, fills } = buildPattern(bars, baseDensity, vDev, !!args.evolve, fillEvery);
      clip.notes = notes;
      const ti = song.tracks.indexOf(track);
      history.clear(keyClip(ti, 0));
      return { success:true, data:{ bars, density: baseDensity, evolve: !!args.evolve, fillEvery, fills, trackIndex: ti, clipName: clip.name, noteCount: notes.length, lanes: lanesOut } };
    }
  );

  reg.register({ name:"add_fill", description:"Drop a drum fill (roll + crescendo) into the last beats of an existing clip", category:"generative", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (default 0)",required:false}, beats:{type:"number",description:"Fill length in beats (default 1)",required:false}, style:{type:"string",description:"Fill voicing",required:false,enum:["snare","tom","mixed"]}, intensity:{type:"number",description:"0-100 density/aggressiveness (default 70)",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index ?? 0);
      if (!clip || !Array.isArray(clip.notes)) return { success:false, error:"No MIDI clip here." };
      const beats = Math.max(0.5, Math.min(8, args.beats || 1));
      const span = clipSpanBeats(clip);
      const start = Math.max(0, span - beats);
      recordNotes(clip, args.track_index, args.clip_index ?? 0, "genrhythm.add_fill");
      const kept = clip.notes.filter((n: any) => n.startTime < start - 1e-9);
      const fill = buildFill(start, beats, args.style || "mixed", args.intensity ?? 70);
      clip.notes = kept.concat(fill);
      return { success:true, data:{ clip:clip.name, fillStart:start, beats, style:args.style || "mixed", fillNotes:fill.length, totalNotes:clip.notes.length } };
    }
  );

  reg.register({ name:"reshuffle", description:"Re-roll a generated clip's pattern (same style/density) into the same clip, with undo", category:"generative", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (default 0)",required:false}, density:{type:"number",description:"Density 0-100 (default 55)",required:false}, humanize:{type:"number",description:"Velocity deviation 0-40 (default 14)",required:false}, fill_every:{type:"number",description:"Auto-fill every Nth bar (0 = off)",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index ?? 0);
      if (!clip || !Array.isArray(clip.notes)) return { success:false, error:"No MIDI clip here." };
      const bars = Math.max(1, Math.min(8, Math.ceil(clipSpanBeats(clip) / 4)));
      recordNotes(clip, args.track_index, args.clip_index ?? 0, "genrhythm.reshuffle");
      const { notes, fills } = buildPattern(bars, args.density ?? 55, args.humanize ?? 14, false, Math.max(0, Math.min(8, args.fill_every || 0)));
      clip.notes = notes;
      return { success:true, data:{ clip:clip.name, bars, reshuffled:true, fills, noteCount:notes.length, undoDepth: history.depth(keyClip(args.track_index, args.clip_index ?? 0)) } };
    }
  );

  reg.register({ name:"undo", description:"Undo the last reshuffle / add_fill on a clip (delegates to the shared Edit History)", category:"generative", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (default 0)",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index ?? 0);
      if (!clip || !Array.isArray(clip.notes)) return { success:false, error:"No MIDI clip here." };
      const e = await history.undoTarget(keyClip(args.track_index, args.clip_index ?? 0));
      if (!e) return { success:false, error:"Nothing to undo on this clip." };
      return { success:true, data:{ clip:clip.name, restored:true, noteCount:clip.notes.length, undoDepth: history.depth(keyClip(args.track_index, args.clip_index ?? 0)) } };
    }
  );

  reg.register({ name:"how_it_works", description:"Explain how the generative rhythm uses native note probability, fills and undo", category:"generative", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Each step gets a probability (0-1) written to the MIDI note's native `probability` field, so Live re-rolls it on every loop.",
      "Velocity carries a `velocityDeviation` so dynamics vary too — patterns breathe instead of repeating exactly.",
      "fill_every drops a roll (crescendo + rising density) on the last beat of every Nth bar; add_fill does the same to any existing clip.",
      "reshuffle re-rolls the whole pattern in place and undo restores the previous take from a per-clip in-session stack.",
    ] } })
  );

  return reg;
}
