// Módulo: MIDI Retime — rescales a clip's note timing between BPM interpretations
// (half-time / double-time / arbitrary factor) by really rewriting startTime/duration.
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

function getClip(song: any, ti: number, ci: number) {
  const t = song?.tracks?.[ti];
  return t?.clipSlots?.[ci ?? 0]?.clip ?? t?.arrangementClips?.[ci ?? 0] ?? null;
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"rescale_clip", description:"Rescale a MIDI clip's note timing between tempo interpretations — half-time, double-time, or from_bpm→to_bpm — really rewriting startTime/duration (undoable)", category:"retime", parameters:{ track_index:{type:"number",description:"Track",required:true}, clip_index:{type:"number",description:"Clip slot (default 0)",required:false}, mode:{type:"string",description:"Preset scaling",required:false,enum:["half_time","double_time","custom"]}, factor:{type:"number",description:"Custom time factor (2 = twice as long/slow feel)",required:false}, from_bpm:{type:"number",description:"Source BPM interpretation",required:false}, to_bpm:{type:"number",description:"Target BPM interpretation",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip || !Array.isArray(clip.notes)) return { success:false, error:"MIDI clip not found" };
      let factor: number;
      if (args.mode === "half_time") factor = 2;
      else if (args.mode === "double_time") factor = 0.5;
      else if (typeof args.from_bpm === "number" && typeof args.to_bpm === "number" && args.to_bpm > 0) factor = args.from_bpm / args.to_bpm;
      else if (typeof args.factor === "number" && args.factor > 0) factor = args.factor;
      else return { success:false, error:"Give mode (half_time/double_time), a factor, or from_bpm + to_bpm." };
      factor = Math.max(0.05, Math.min(20, factor));
      const src = clip.notes || [];
      if (!src.length) return { success:false, error:"Clip has no notes." };
      recordNotes(clip, args.track_index, args.clip_index ?? 0, "retime.rescale_clip");
      const before = Math.max(...src.map((n: any) => n.startTime + (n.duration || 0)));
      clip.notes = src.map((n: any) => ({ ...n, startTime: Number((n.startTime * factor).toFixed(6)), duration: Number(((n.duration || 0.25) * factor).toFixed(6)) }));
      const after = before * factor;
      try { if (typeof clip.loopEnd === "number") clip.loopEnd = Math.max(clip.loopStart || 0, clip.loopEnd * factor); } catch { /* loopEnd not settable here */ }
      return { success:true, data:{ rescaled:true, factor:Number(factor.toFixed(4)), notes:src.length, spanBeatsBefore:Number(before.toFixed(3)), spanBeatsAfter:Number(after.toFixed(3)), undoable:true } };
    }
  );

  return reg;
}
