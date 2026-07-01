// Módulo: Notation Viewer — get_score now derives real measures from the clip's actual notes
// instead of a fixed hardcoded score, and transpose_score really rewrites clip.notes (undoable).
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

const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_clip_notes", description:"Get all MIDI notes in a clip as notation data", category:"notation", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const clip = track.clipSlots?.[args.clip_index ?? 0]?.clip ?? track.arrangementClips?.[args.clip_index ?? 0];
      if (!clip) return { success:false, error:"Clip not found" };
      const notes = (clip.notes || [])
        .slice()
        .sort((a: any, b: any) => a.startTime - b.startTime)
        .map((n: any) => ({ note:NOTE_NAMES[n.pitch % 12] + Math.floor(n.pitch / 12 - 1), pitch:n.pitch, start:n.startTime, duration:n.duration, velocity:n.velocity ?? 100 }));
      const key = `${NOTE_NAMES[(song.rootNote || 0) % 12]} ${song.scaleName || "Major"}`;
      const sc = (song.scenes || [])[0];
      const ts = sc ? `${sc.signatureNumerator ?? 4}/${sc.signatureDenominator ?? 4}` : "4/4";
      return { success:true, data:{ trackName:track.name, noteCount:notes.length, timeSignature:ts, keySignature:key, clef:"treble", notes } };
    }
  );

  reg.register({ name:"get_score", description:"Get notation score as structured data, grouped into real measures (4 beats each) from the clip's actual notes", category:"notation", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.track_index];
      const clip = track?.clipSlots?.[args.clip_index ?? 0]?.clip ?? track?.arrangementClips?.[args.clip_index ?? 0];
      if (!clip || !Array.isArray(clip.notes)) return { success:false, error:"MIDI clip not found" };
      const beatsPerMeasure = 4;
      const totalMeasures = Math.max(1, Math.ceil((clip.duration || 4) / beatsPerMeasure));
      const durSymbol = (d: number) => d >= 3.5 ? "whole" : d >= 1.75 ? "half" : d >= 0.875 ? "quarter" : d >= 0.4375 ? "eighth" : "sixteenth";
      const measures = Array.from({ length: totalMeasures }, (_, i) => {
        const mStart = i * beatsPerMeasure, mEnd = mStart + beatsPerMeasure;
        const notes = clip.notes
          .filter((n: any) => n.startTime >= mStart && n.startTime < mEnd)
          .sort((a: any, b: any) => a.startTime - b.startTime)
          .map((n: any) => ({ symbol: durSymbol(n.duration || 0.25), pitch: `${NOTE_NAMES[n.pitch % 12]}${Math.floor(n.pitch / 12 - 1)}`, accidental: NOTE_NAMES[n.pitch % 12].includes("#") ? "sharp" : null, dot:false }));
        return { measure:i + 1, beats:beatsPerMeasure, notes };
      });
      return { success:true, data:{ trackIndex:args.track_index, clipIndex:args.clip_index, measures, totalMeasures, resolution:"1/16" } };
    }
  );

  reg.register({ name:"transpose_score", description:"Transpose the clip's real MIDI notes by N semitones (undoable)", category:"notation", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, semitones:{type:"number",description:"Semitones to transpose",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.track_index];
      const clip = track?.clipSlots?.[args.clip_index ?? 0]?.clip ?? track?.arrangementClips?.[args.clip_index ?? 0];
      if (!clip || !Array.isArray(clip.notes)) return { success:false, error:"MIDI clip not found" };
      recordNotes(clip, args.track_index, args.clip_index ?? 0, "notation.transpose_score");
      clip.notes = clip.notes.map((n: any) => ({ ...n, pitch: Math.max(0, Math.min(127, n.pitch + args.semitones)) }));
      return { success:true, data:{ transposed:true, by:args.semitones, noteCount:clip.notes.length } };
    }
  );

  return reg;
}
