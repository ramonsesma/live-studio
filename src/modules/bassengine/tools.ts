// Módulo: Bass Engine — generates basslines that feel physical, not random: scale-aware notes
// with octave jumps, ghost hits (native low-probability notes), sub-hold (long low roots) and
// humanized velocity. `mutate` reshapes an existing bass clip while keeping its contour, with
// undo via the shared Edit History. Pure note writing — fits the SDK's clip model.
import { recordNotes } from "../../core/history.js";

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

const PC: Record<string, number> = { c: 0, "c#": 1, db: 1, d: 2, "d#": 3, eb: 3, e: 4, f: 5, "f#": 6, gb: 6, g: 7, "g#": 8, ab: 8, a: 9, "a#": 10, bb: 10, b: 11 };
const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10],
};
const G = 0.25;
const clampPitch = (p: number) => Math.max(24, Math.min(60, p));
const clampV = (v: number) => Math.max(1, Math.min(127, Math.round(v)));
function rootPc(root: any): number { if (typeof root === "number") return ((root % 12) + 12) % 12; const k = String(root || "C").trim().toLowerCase(); return PC[k] ?? 0; }
function getClip(song: any, ti: number, ci: number) { const t = song?.tracks?.[ti]; return t?.clipSlots?.[ci ?? 0]?.clip ?? t?.arrangementClips?.[ci ?? 0]; }

function buildBass(opts: { base: number; tones: number[]; bars: number; style: string; density: number; ghosts: number; humanize: number }) {
  const { base, tones, bars, style, density, ghosts, humanize } = opts;
  const d = Math.max(0, Math.min(1, density / 100)), gh = Math.max(0, Math.min(1, ghosts / 100));
  const walk = [tones[0], tones[2] ?? 0, tones[4] ?? 7, tones[1] ?? 2]; // root, 3rd, 5th, 2nd
  const notes: any[] = [];
  for (let b = 0; b < bars; b++) {
    for (let s = 0; s < 16; s++) {
      const onDown = s % 8 === 0, onQuarter = s % 4 === 0, onEighth = s % 2 === 0;
      let hit = false, accent = false;
      if (style === "sub") hit = onDown;
      else if (onDown) { hit = true; accent = true; }
      else if (onQuarter) hit = Math.random() < 0.55 + d * 0.4;
      else if (onEighth) hit = Math.random() < d * 0.45;
      else hit = Math.random() < d * 0.18;
      if (hit) {
        let pitch = base;
        if (style === "octave") pitch = onDown ? base : (Math.random() < 0.5 ? base + 12 : base + (tones[4] ?? 7));
        else if (style === "walking") pitch = base + walk[Math.floor(s / 4) % 4] + (Math.random() < 0.15 ? 12 : 0);
        else if (style === "driving") pitch = base + (Math.random() < 0.2 ? 12 : 0);
        const dur = style === "sub" ? 1.9 : G * (Math.random() < 0.3 ? 2.6 : 1.6);
        notes.push({ pitch: clampPitch(pitch), startTime: (b * 16 + s) * G, duration: dur, velocity: clampV(accent ? 110 : 92), velocityDeviation: humanize, probability: 1 });
      } else if (s % 2 === 1 && Math.random() < gh) {
        notes.push({ pitch: clampPitch(base), startTime: (b * 16 + s) * G, duration: G * 0.5, velocity: clampV(40 + Math.random() * 15), velocityDeviation: Math.max(humanize, 8), probability: Number((0.35 + Math.random() * 0.25).toFixed(2)) });
      }
    }
  }
  return notes;
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"generate", description:"Generate a bassline (octave jumps, ghost hits, sub-hold) into a new or existing track", category:"generative", parameters:{ root:{type:"string",description:"Root note name or pitch-class (default C)",required:false}, scale:{type:"string",description:"Scale",required:false,enum:Object.keys(SCALES)}, bars:{type:"number",description:"Bars (default 2)",required:false}, octave:{type:"number",description:"Bass octave 0-3 (default 1)",required:false}, style:{type:"string",description:"Bassline style",required:false,enum:["root","octave","walking","driving","sub"]}, density:{type:"number",description:"Density 0-100 (default 60)",required:false}, ghosts:{type:"number",description:"Ghost-note chance 0-100 (default 30)",required:false}, humanize:{type:"number",description:"Velocity deviation 0-40 (default 10)",required:false}, track_index:{type:"number",description:"Existing track (omit = new)",required:false} } },
    async (args: any, song: any) => {
      const pc = rootPc(args.root ?? "C");
      const tones = SCALES[args.scale] || SCALES.minor;
      const bars = Math.max(1, Math.min(8, args.bars || 2));
      const octave = Math.max(0, Math.min(3, args.octave ?? 1));
      const base = clampPitch(24 + (octave - 1) * 12 + pc);
      const style = args.style || "octave";
      const notes = buildBass({ base, tones, bars, style, density: args.density ?? 60, ghosts: args.ghosts ?? 30, humanize: args.humanize ?? 10 });
      const track = args.track_index != null ? song.tracks[args.track_index] : await song.createMidiTrack();
      if (!track) return { success:false, error:"Track not found" };
      if (args.track_index == null) track.name = `Bass ${String(args.root ?? "C")} ${style}`;
      const clip = await track.createMidiClip(0, bars * 4);
      clip.name = `Bass ${style}`;
      clip.notes = notes;
      return { success:true, data:{ root: rootPc(args.root ?? "C"), scale: args.scale || "minor", style, bars, baseNote: base, trackIndex: song.tracks.indexOf(track), clipName: clip.name, noteCount: notes.length, ghosts: notes.filter((n) => n.probability < 1).length, notes: notes.slice(0, 200).map((n) => ({ pitch: n.pitch, start: Number(n.startTime.toFixed(3)), dur: n.duration, vel: n.velocity, ghost: n.probability < 1 })) } };
    }
  );

  reg.register({ name:"mutate", description:"Mutate an existing bass clip (octave flips, ghost toggles, accent shifts) keeping its contour — undoable via Edit History", category:"generative", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (default 0)",required:false}, amount:{type:"number",description:"How much to mutate 0-100 (default 35)",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index ?? 0);
      if (!clip || !Array.isArray(clip.notes) || !clip.notes.length) return { success:false, error:"No bass clip with notes here." };
      const amt = Math.max(0, Math.min(1, (args.amount ?? 35) / 100));
      recordNotes(clip, args.track_index, args.clip_index ?? 0, "bassengine.mutate");
      let changed = 0;
      const out = clip.notes.map((n: any) => {
        const m = { ...n };
        if (Math.random() < amt * 0.6) { m.pitch = clampPitch(n.pitch + (Math.random() < 0.5 ? 12 : -12)); changed++; }
        if (Math.random() < amt * 0.5) { m.velocity = clampV((n.velocity ?? 100) + (Math.random() * 40 - 20)); changed++; }
        if (Math.random() < amt * 0.3) { m.probability = (n.probability ?? 1) < 1 ? 1 : Number((0.35 + Math.random() * 0.25).toFixed(2)); changed++; }
        return m;
      });
      clip.notes = out;
      return { success:true, data:{ clip: clip.name, amount: Math.round(amt * 100), notesChanged: changed, noteCount: out.length } };
    }
  );

  return reg;
}
