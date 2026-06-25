// Módulo: MIDI Phrase Finder — searches the CURRENT Set's MIDI clips for a melodic pattern
// (intervals, optionally transpose-aware) and highlights matches via clip.color. The SDK only
// sees the open Set (it can't read other .als files), so this is in-project phrase search.
import { recordColor } from "../../core/history.js";
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

const NN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function parsePattern(p: string): { offsets: number[]; absolute: number[] | null } {
  const toks = String(p).split(/[\s,]+/).filter(Boolean);
  if (toks.every((t) => /^[A-Ga-g][#b]?-?\d$/.test(t))) {
    const pitches = toks.map((t) => { const m = t.match(/^([A-Ga-g])([#b]?)(-?\d)$/)!; const base = STEP[m[1].toUpperCase()]; const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0; return (parseInt(m[3]) + 1) * 12 + base + acc; });
    return { offsets: pitches.map((x) => x - pitches[0]), absolute: pitches };
  }
  const nums = toks.map(Number).filter((n) => !isNaN(n));
  const offsets = nums.map((x) => x - nums[0]);
  return { offsets, absolute: null };
}

// Top-note melody (one pitch per start time) for a clip's notes.
function melody(notes: any[]): { pitch: number; startTime: number }[] {
  const byStart: Record<string, any[]> = {};
  for (const n of notes) (byStart[n.startTime.toFixed(4)] ||= []).push(n);
  return Object.keys(byStart).map((k) => ({ pitch: Math.max(...byStart[k].map((n) => n.pitch)), startTime: Number(k) })).sort((a, b) => a.startTime - b.startTime);
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"find_phrase", description:"Search the Set's MIDI clips for a melodic pattern (intervals like '0,7,12,7' or note names like 'C2,G2,C3')", category:"search", parameters:{ pattern:{type:"string",description:"Intervals from the root, or absolute note names",required:true}, transpose_aware:{type:"boolean",description:"Match in any key (default true)",required:false} } },
    async (args: any, song: any) => {
      const { offsets, absolute } = parsePattern(args.pattern);
      if (offsets.length < 2) return { success:false, error:"Give at least 2 notes/intervals." };
      const transpose = args.transpose_aware !== false;
      const matches: any[] = [];
      const tracks = song?.tracks || [];
      for (let ti = 0; ti < tracks.length; ti++) {
        const t = tracks[ti];
        const clips: { clip: any; where: string; idx: number }[] = [];
        (t.clipSlots || []).forEach((sl: any, i: number) => { if (sl?.clip && Array.isArray(sl.clip.notes)) clips.push({ clip: sl.clip, where: "slot", idx: i }); });
        (t.arrangementClips || []).forEach((c: any, i: number) => { if (c && Array.isArray(c.notes)) clips.push({ clip: c, where: "arr", idx: i }); });
        for (const { clip, where, idx } of clips) {
          const mel = melody(clip.notes);
          for (let s = 0; s + offsets.length <= mel.length; s++) {
            const win = mel.slice(s, s + offsets.length);
            const winOff = win.map((n) => n.pitch - win[0].pitch);
            const ok = winOff.every((o, i) => o === offsets[i]) && (transpose || !absolute || win[0].pitch === absolute[0]);
            if (ok) matches.push({ trackIndex: ti, trackName: t.name, where, clipIndex: idx, clipName: clip.name, startBeat: Number(win[0].startTime.toFixed(3)), pitches: win.map((n) => NN[((n.pitch % 12) + 12) % 12] + (Math.floor(n.pitch / 12) - 1)) });
          }
        }
      }
      return { success:true, data:{ pattern: offsets, transposeAware: transpose, count: matches.length, matches: matches.slice(0, 200) } };
    }
  );

  reg.register({ name:"highlight_match", description:"Color a clip to highlight a found phrase (Live can't navigate, but it can recolor)", category:"search", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:false}, color:{type:"number",description:"Live clip color index (default a bright highlight)",required:false} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t) return { success:false, error:"Track not found" };
      const clip = t.clipSlots?.[args.clip_index ?? 0]?.clip ?? t.arrangementClips?.[args.clip_index ?? 0];
      if (!clip || !("color" in clip)) return { success:false, error:"Clip not found" };
      try { recordColor(clip, args.track_index, args.clip_index ?? 0, "phrasefinder.highlight_match"); clip.color = args.color ?? 16; } catch { return { success:false, error:"Could not set color" }; }
      return { success:true, data:{ highlighted:true, trackIndex:args.track_index, color:args.color ?? 16 } };
    }
  );

  return reg;
}
