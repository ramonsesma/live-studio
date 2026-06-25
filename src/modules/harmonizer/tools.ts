// Módulo: MIDI Harmonizer — reutilizado de examples/midi-harmonizer
import { recordNotes } from "../../core/history.js";
export class ToolRegistry {
  private handlers = new Map();
  definitions: any[] = [];
  register(def: any, handler: any) { this.definitions.push(def); this.handlers.set(def.name, handler); }
  async execute(name: string, args: any, song: any) {
    const handler = this.handlers.get(name);
    if (!handler) return { success: false, error: `Unknown: ${name}` };
    try { return await handler(args, song); }
    catch (err: any) { return { success: false, error: err.message || String(err) }; }
  }
  getDefinitionsJson() { return this.definitions; }
}

const INTERVALS: any = { unison:0, m2:1, M2:2, m3:3, M3:4, P4:5, d5:6, P5:7, m6:8, M6:9, m7:10, M7:11, octave:12 };
const VOICINGS: any = {
  close: { desc:"All notes within one octave", offsets:[0,2,4] },
  open: { desc:"Spread voicing with gaps", offsets:[0,4,8] },
  drop2: { desc:"Drop 2 voicing", offsets:[0,-2,2,6] },
  spread: { desc:"Wide spread voicing", offsets:[0,8,12,16] }
};

const PC: Record<string, number> = { c:0, "c#":1, db:1, d:2, "d#":3, eb:3, e:4, f:5, "f#":6, gb:6, g:7, "g#":8, ab:8, a:9, "a#":10, bb:10, b:11 };
const SCALE_DEG: Record<string, number[]> = { major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10], dorian:[0,2,3,5,7,9,10], phrygian:[0,1,3,5,7,8,10], lydian:[0,2,4,6,7,9,11], mixolydian:[0,2,4,5,7,9,10] };
const ROMAN: Record<string, number> = { i:0, ii:1, iii:2, iv:3, v:4, vi:5, vii:6 };
const CLEN: Record<string, number> = { triad:3, "7th":4, "9th":5, "11th":6 };
// One chord rooted on scale degree `deg`, stacking thirds within the key.
function chordTones(deg: number, scale: number[], base: number, count: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < count; k++) { const idx = deg + 2 * k; out.push(base + scale[idx % 7] + 12 * Math.floor(idx / 7)); }
  return out;
}
function applySpread(tones: number[], spread: string): number[] {
  const t = tones.slice();
  if (spread === "open") return t.map((p, i) => (i % 2 === 1 ? p + 12 : p));
  if (spread === "drop2" && t.length >= 2) { t[t.length - 2] -= 12; return t.sort((a, b) => a - b); }
  if (spread === "spread") return t.map((p, i) => p + 12 * i);
  return t; // close
}
function applyInversion(tones: number[], inv: number): number[] {
  const t = tones.slice().sort((a, b) => a - b);
  for (let i = 0; i < inv; i++) { const lo = t.shift()!; t.push(lo + 12); }
  return t;
}

const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const CHORD_TEMPLATES: { q: string; pcs: number[] }[] = [
  { q:"maj7", pcs:[0,4,7,11] }, { q:"7", pcs:[0,4,7,10] }, { q:"min7", pcs:[0,3,7,10] }, { q:"m7b5", pcs:[0,3,6,10] },
  { q:"dim7", pcs:[0,3,6,9] }, { q:"6", pcs:[0,4,7,9] }, { q:"min6", pcs:[0,3,7,9] }, { q:"maj", pcs:[0,4,7] },
  { q:"min", pcs:[0,3,7] }, { q:"dim", pcs:[0,3,6] }, { q:"aug", pcs:[0,4,8] }, { q:"sus2", pcs:[0,2,7] }, { q:"sus4", pcs:[0,5,7] },
];
const CHORD_SYM: Record<string, string> = { maj:"", min:"m", dim:"dim", aug:"aug", maj7:"maj7", "7":"7", min7:"m7", m7b5:"m7b5", dim7:"dim7", "6":"6", min6:"m6", sus2:"sus2", sus4:"sus4" };
// Name a set of pitch-classes: try each present pc as root, score against templates by overlap.
function nameChord(pcsSet: Set<number>): { name: string; root: number; quality: string; score: number } | null {
  if (!pcsSet.size) return null;
  let best: any = null;
  for (const root of pcsSet) {
    const rel = new Set([...pcsSet].map((p) => ((p - root) % 12 + 12) % 12));
    for (const t of CHORD_TEMPLATES) {
      const tpl = new Set(t.pcs);
      let inter = 0; for (const x of rel) if (tpl.has(x)) inter++;
      const score = inter - 0.34 * (rel.size - inter) - 0.15 * (tpl.size - inter); // reward overlap, punish extras/missing
      if (!best || score > best.score) best = { name: `${NN[root]}${CHORD_SYM[t.q] ?? t.q}`, root, quality: t.q, score };
    }
  }
  return best;
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"detect_chords", description:"Identify the chords in a MIDI clip: groups simultaneous notes and names each (root + quality)", category:"harmony", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (default 0)",required:false} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t) return { success:false, error:"Track not found" };
      const clip = t.clipSlots?.[args.clip_index ?? 0]?.clip ?? t.arrangementClips?.[args.clip_index ?? 0];
      if (!clip || !Array.isArray(clip.notes) || !clip.notes.length) return { success:false, error:"No MIDI clip with notes here." };
      const groups = new Map<number, any[]>();
      for (const n of clip.notes) { const k = Math.round(n.startTime * 4) / 4; (groups.get(k) || groups.set(k, []).get(k))!.push(n); }
      const chords = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([start, ns]) => {
        const pcs = new Set<number>(ns.map((n) => ((n.pitch % 12) + 12) % 12));
        const bass = Math.min(...ns.map((n) => n.pitch));
        const named = nameChord(pcs);
        return { start, noteCount: ns.length, bass: NN[((bass % 12) + 12) % 12] + (Math.floor(bass / 12) - 1), chord: named && named.score > 0.5 ? named.name : "—", quality: named?.quality ?? null };
      });
      const summary = chords.filter((c) => c.chord !== "—").map((c) => c.chord);
      return { success:true, data:{ clip: clip.name, chordCount: chords.length, progression: summary.join(" → "), chords } };
    }
  );

  reg.register({ name:"suggest_next", description:"Suggest likely next chords by functional harmony, from a key + current chord (or auto-detected from a clip)", category:"harmony", parameters:{ key:{type:"string",description:"Key root (C, A, F#…) (default C)",required:false}, scale:{type:"string",description:"major or minor (default major)",required:false,enum:["major","minor"]}, current:{type:"string",description:"Current chord as a roman numeral (I, ii, V…) — ignored if a clip is given",required:false}, track_index:{type:"number",description:"Detect the last chord from this track's clip",required:false}, clip_index:{type:"number",description:"Clip index (default 0)",required:false} } },
    async (args: any, song: any) => {
      const isMinor = args.scale === "minor";
      const scaleSemis = isMinor ? SCALE_DEG.minor : SCALE_DEG.major;
      const keyPc = PC[String(args.key ?? "C").trim().toLowerCase()] ?? 0;
      const QUAL = isMinor ? ["min","dim","maj","min","min","maj","maj"] : ["maj","min","min","maj","maj","min","dim"];
      const ROMANS = isMinor ? ["i","ii°","III","iv","v","VI","VII"] : ["I","ii","iii","IV","V","vi","vii°"];
      const TRANS: Record<number, number[]> = isMinor
        ? { 0:[3,4,5,1], 1:[4,0], 2:[5,3], 3:[4,0,1], 4:[0,5], 5:[1,3,4,2], 6:[2,0] }
        : { 0:[3,4,5,1], 1:[4,6], 2:[5,3], 3:[4,0,1], 4:[0,5], 5:[1,3,4], 6:[0] };
      const fn = (d: number) => ([0,2,5].includes(d) ? "tonic" : [1,3].includes(d) ? "subdominant" : "dominant");
      const degName = (d: number) => `${NN[(keyPc + scaleSemis[d]) % 12]}${CHORD_SYM[QUAL[d]] ?? ""}`;
      // resolve current degree
      let curDeg = 0, detected: string | null = null;
      if (args.track_index != null) {
        const t = song?.tracks?.[args.track_index];
        const clip = t?.clipSlots?.[args.clip_index ?? 0]?.clip ?? t?.arrangementClips?.[args.clip_index ?? 0];
        if (clip && Array.isArray(clip.notes) && clip.notes.length) {
          const last = Math.max(...clip.notes.map((n: any) => n.startTime));
          const pcs = new Set<number>(clip.notes.filter((n: any) => Math.abs(n.startTime - last) < 0.25).map((n: any) => ((n.pitch % 12) + 12) % 12));
          const named = nameChord(pcs);
          if (named) { detected = named.name; const rel = ((named.root - keyPc) % 12 + 12) % 12; const d = scaleSemis.indexOf(rel); curDeg = d >= 0 ? d : 0; }
        }
      } else if (args.current) {
        const r = String(args.current).trim().toLowerCase().replace(/[^ivx]/g, "");
        const ROMAN_IN: Record<string, number> = { i:0, ii:1, iii:2, iv:3, v:4, vi:5, vii:6 };
        curDeg = ROMAN_IN[r] ?? 0;
      }
      const nexts = (TRANS[curDeg] || []).map((d) => ({ roman: ROMANS[d], chord: degName(d), "function": fn(d) }));
      return { success:true, data:{ key: args.key || "C", scale: args.scale || "major", current: { roman: ROMANS[curDeg], chord: degName(curDeg), detected }, suggestions: nexts } };
    }
  );

  reg.register({ name:"generate_expressive", description:"Generate an expressive chord progression clip: spread, tensions, inversions, human feel, bass root, top line and optional arp", category:"harmony", parameters:{ key:{type:"string",description:"Key root (C, F#, Bb…)",required:false}, scale:{type:"string",description:"Scale",required:false,enum:Object.keys(SCALE_DEG)}, degrees:{type:"string",description:"Roman-numeral degrees, e.g. 'i,VI,III,VII' (default i,iv,v)",required:false}, bars_per_chord:{type:"number",description:"Bars per chord (default 1)",required:false}, spread:{type:"string",description:"Voicing spread",required:false,enum:["close","open","drop2","spread"]}, complexity:{type:"string",description:"Chord size",required:false,enum:["triad","7th","9th","11th"]}, inversions:{type:"number",description:"Inversion 0-3 (default 0)",required:false}, human_feel:{type:"number",description:"0-100 timing+velocity humanize (default 25)",required:false}, bass_root:{type:"boolean",description:"Add the root an octave below",required:false}, top_line:{type:"boolean",description:"Accent the top voice (lead)",required:false}, arp:{type:"boolean",description:"Arpeggiate instead of block chords",required:false}, arp_rate:{type:"string",description:"Arp rate",required:false,enum:["1/8","1/16"]}, track_index:{type:"number",description:"Existing track (omit = new)",required:false} } },
    async (args: any, song: any) => {
      const keyPc = PC[String(args.key ?? "C").trim().toLowerCase()] ?? 0;
      const scale = SCALE_DEG[args.scale] || SCALE_DEG.minor;
      const degs = String(args.degrees || "i,iv,v").split(",").map((d) => ROMAN[d.trim().toLowerCase().replace(/[^iv]/g, "")] ?? 0);
      const barsPer = Math.max(1, Math.min(4, args.bars_per_chord || 1));
      const count = CLEN[args.complexity] || 3;
      const hf = Math.max(0, Math.min(1, (args.human_feel ?? 25) / 100));
      const base = 48 + keyPc;
      const arpStep = args.arp_rate === "1/16" ? 0.25 : 0.5;
      const notes: any[] = [];
      const chordsOut: any[] = [];
      degs.forEach((deg, ci) => {
        const startBeat = ci * barsPer * 4;
        let tones = applyInversion(applySpread(chordTones(deg, scale, base, count), args.spread || "close"), Math.max(0, Math.min(3, args.inversions || 0)));
        if (args.bass_root) tones = [base + scale[deg % 7] - 12, ...tones];
        tones = tones.sort((a, b) => a - b);
        const lenBeats = barsPer * 4;
        if (args.arp) {
          let i = 0; for (let t = 0; t < lenBeats; t += arpStep) { const p = tones[i % tones.length]; notes.push({ pitch: p, startTime: startBeat + t + (Math.random() - 0.5) * 0.02 * hf, duration: arpStep * 0.95, velocity: Math.round(88 + (Math.random() - 0.5) * 30 * hf), velocityDeviation: Math.round(hf * 18) }); i++; }
        } else {
          tones.forEach((p, vi) => { const top = vi === tones.length - 1; notes.push({ pitch: p, startTime: startBeat + (Math.random() - 0.5) * 0.03 * hf, duration: lenBeats * 0.95, velocity: Math.round((args.top_line && top ? 104 : 86) + (Math.random() - 0.5) * 26 * hf), velocityDeviation: Math.round(hf * 16) }); });
        }
        chordsOut.push({ degree: Object.keys(ROMAN)[deg], tones });
      });
      const track = args.track_index != null ? song.tracks[args.track_index] : await song.createMidiTrack();
      if (!track) return { success:false, error:"Track not found" };
      if (args.track_index == null) track.name = `${String(args.key ?? "C")} ${args.scale || "minor"} chords`;
      const span = Math.max(4, degs.length * barsPer * 4);
      const clip = await track.createMidiClip(0, span);
      clip.name = `${args.spread || "close"} ${args.complexity || "triad"}${args.arp ? " arp" : ""}`;
      clip.notes = notes.map((n) => ({ ...n, startTime: Math.max(0, n.startTime), velocity: Math.max(1, Math.min(127, n.velocity)) }));
      return { success:true, data:{ key:args.key || "C", scale:args.scale || "minor", chords: chordsOut, spread:args.spread || "close", complexity:args.complexity || "triad", arp:!!args.arp, trackIndex: song.tracks.indexOf(track), clipName: clip.name, noteCount: clip.notes.length } };
    }
  );

  reg.register({ name:"get_voicings", description:"Get available chord voicing types", category:"harmony", parameters:{} },
    async () => ({ success:true, data:Object.entries(VOICINGS).map(([k,v]: any)=>({ name:k, description:v.desc })) })
  );

  reg.register({ name:"harmonize_note", description:"Add harmony voices to selected MIDI notes", category:"harmony", parameters:{ track_index:{type:"number",description:"Track index",required:true}, interval:{type:"string",description:"Harmony interval",required:true,enum:Object.keys(INTERVALS)}, voices:{type:"number",description:"Number of harmony voices",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const interval = INTERVALS[args.interval] || 4;
      const voices = args.voices || 2;
      return { success:true, data:{ applied:true, trackIndex:args.track_index, interval, voices, harmonyNotes:voices*8, trackName:track.name } };
    }
  );

  reg.register({ name:"apply_voice_leading", description:"Apply voice leading to a chord progression clip", category:"harmony", parameters:{ track_index:{type:"number",description:"Track index",required:true}, voicing:{type:"string",description:"Voicing type",required:false,enum:Object.keys(VOICINGS)}, smooth:{type:"boolean",description:"Use smooth voice leading",required:false} } },
    async (args: any, song: any) => {
      const clip = song.tracks?.[args.track_index]?.clipSlots?.[0]?.clip ?? song.tracks?.[args.track_index]?.arrangementClips?.[0];
      if (!clip) return { success:false, error:"MIDI clip not found on this track" };
      recordNotes(clip, args.track_index, 0, "harmonizer.apply_voice_leading");
      const notes = (clip.notes || []).slice();
      // Group simultaneous notes into chords and collapse each into close (within-octave) voicing.
      const groups = new Map<number, any[]>();
      for (const n of notes) { const k = Math.round(n.startTime * 1000); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(n); }
      let chords = 0;
      for (const g of groups.values()) {
        if (g.length < 2) continue;
        const lo = Math.min(...g.map((n: any) => n.pitch));
        for (const n of g) { while (n.pitch - lo >= 12) n.pitch -= 12; }
        chords++;
      }
      clip.notes = notes;
      return { success:true, data:{ applied:true, trackIndex:args.track_index, voicing:args.voicing || "close", chordsRevoiced:chords, noteCount:notes.length } };
    }
  );

  reg.register({ name:"generate_chord_clip", description:"Generate a chord progression MIDI clip from scale degrees", category:"harmony", parameters:{ key:{type:"string",description:"Root key (C, D, E, etc)",required:true}, scale:{type:"string",description:"Scale type",required:true,enum:["major","minor","dorian","phrygian","lydian","mixolydian"]}, degrees:{type:"string",description:"Comma-separated scale degrees (e.g. I,IV,V)",required:true}, track_index:{type:"number",description:"Target track",required:false} } },
    async (args: any, song: any) => {
      const trackIdx = args.track_index;
      const track = trackIdx !== undefined ? song.tracks[trackIdx] : await song.createMidiTrack();
      if (trackIdx === undefined) track.name = `${args.key} ${args.scale} chords`;
      const degrees = String(args.degrees).split(",").map((d: string)=>d.trim());
      const clip = await track.createMidiClip(0, degrees.length * 4);
      clip.name = `${args.key} ${args.scale}`;
      return { success:true, data:{ key:args.key, scale:args.scale, degrees, chordCount:degrees.length, trackIndex:song.tracks.indexOf(track), clipName:clip.name } };
    }
  );

  return reg;
}
