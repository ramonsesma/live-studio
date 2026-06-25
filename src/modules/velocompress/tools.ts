// Módulo: Velocity Compressor — treats a MIDI clip's note velocities like an audio
// signal: histogram + downward compression above a threshold with ratio + makeup,
// written back in place. Pure note.velocity math (a property Live can't shape per-clip).
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

const clampV = (v: number) => Math.max(1, Math.min(127, Math.round(v)));
function getClip(song: any, ti: number, ci: number) {
  const t = song?.tracks?.[ti]; if (!t) return { error: "Track not found" };
  const clip = t.clipSlots?.[ci]?.clip ?? t.arrangementClips?.[ci];
  if (!clip || !Array.isArray(clip.notes)) return { error: "No MIDI clip here." };
  return { track: t, clip };
}
function histogram(vels: number[]) {
  const bins = new Array(16).fill(0); // 8-wide buckets across 0..127
  for (const v of vels) bins[Math.min(15, Math.floor(v / 8))]++;
  return bins.map((count, i) => ({ from: i * 8, to: i * 8 + 7, count }));
}
function stats(vels: number[]) {
  if (!vels.length) return { count: 0 };
  const s = [...vels].sort((a, b) => a - b);
  const mean = vels.reduce((a, b) => a + b, 0) / vels.length;
  return { count: vels.length, min: s[0], max: s[s.length - 1], mean: Math.round(mean), median: s[Math.floor(s.length / 2)] };
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"analyze", description:"Velocity histogram + stats for a MIDI clip", category:"midi", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (default 0)",required:false} } },
    async (args: any, song: any) => {
      const g = getClip(song, args.track_index, args.clip_index ?? 0); if (g.error) return { success:false, error:g.error };
      const vels = g.clip.notes.map((n: any) => n.velocity ?? 100);
      return { success:true, data:{ clip:g.clip.name, ...stats(vels), histogram: histogram(vels) } };
    }
  );

  reg.register({ name:"compress", description:"Downward-compress note velocities above a threshold (ratio + makeup), written in place", category:"midi", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (default 0)",required:false}, threshold:{type:"number",description:"Velocity threshold 1-127 (default 90)",required:false}, ratio:{type:"number",description:"Compression ratio (default 2)",required:false}, makeup:{type:"number",description:"Makeup gain added after (default 0)",required:false}, floor:{type:"number",description:"Upward floor: lift velocities below it toward threshold (0 = off)",required:false} } },
    async (args: any, song: any) => {
      const g = getClip(song, args.track_index, args.clip_index ?? 0); if (g.error) return { success:false, error:g.error };
      const th = Math.max(1, Math.min(127, args.threshold ?? 90));
      const ratio = Math.max(1, args.ratio ?? 2);
      const makeup = args.makeup ?? 0;
      const floor = args.floor ?? 0;
      const before = g.clip.notes.map((n: any) => n.velocity ?? 100);
      const out = g.clip.notes.map((n: any) => {
        let v = n.velocity ?? 100;
        if (v > th) v = th + (v - th) / ratio;            // downward above threshold
        else if (floor > 0 && v < floor) v = v + (floor - v) * (1 - 1 / ratio); // optional upward floor
        return { ...n, velocity: clampV(v + makeup) };
      });
      recordNotes(g.clip, args.track_index, args.clip_index ?? 0, "velocompress.compress");
      g.clip.notes = out;
      const after = out.map((n: any) => n.velocity);
      return { success:true, data:{ clip:g.clip.name, threshold:th, ratio, makeup, noteCount:out.length, before: stats(before), after: stats(after), histogramAfter: histogram(after) } };
    }
  );

  return reg;
}
