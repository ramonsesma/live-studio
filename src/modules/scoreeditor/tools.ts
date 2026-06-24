// Módulo: Score Editor — MIDI ↔ notation. Renders a clip as a staff (in the webview panel),
// exports MusicXML (portable to MuseScore/Sibelius/Dorico → PDF) and imports MusicXML back
// into a new MIDI clip. All pure logic over MidiClip.notes + Scene time signature.
import { toMusicXML, fromMusicXML } from "../../core/musicxml.js";

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
  const t = song?.tracks?.[ti]; if (!t) return null;
  return t.clipSlots?.[ci ?? 0]?.clip ?? t.arrangementClips?.[ci ?? 0] ?? null;
}
function timeSig(song: any) { const sc = (song?.scenes || [])[0]; return { num: sc?.signatureNumerator ?? 4, den: sc?.signatureDenominator ?? 4 }; }

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_score_data", description:"Get a clip's notes + time signature + tempo for notation rendering", category:"notation", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (default 0)",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index ?? 0);
      if (!clip || !Array.isArray(clip.notes)) return { success:false, error:"No MIDI clip with notes here." };
      const ts = timeSig(song);
      const notes = clip.notes.slice().sort((a: any, b: any) => a.startTime - b.startTime).map((n: any) => ({ pitch:n.pitch, start:n.startTime, duration:n.duration, velocity:n.velocity ?? 100 }));
      return { success:true, data:{ trackName:song.tracks[args.track_index].name, clipName:clip.name, num:ts.num, den:ts.den, tempo:song?.tempo ?? 120, noteCount:notes.length, notes } };
    }
  );

  reg.register({ name:"to_musicxml", description:"Export a clip to MusicXML (open in MuseScore/Sibelius/Dorico to engrave + PDF)", category:"notation", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (default 0)",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index ?? 0);
      if (!clip || !Array.isArray(clip.notes)) return { success:false, error:"No MIDI clip with notes here." };
      const ts = timeSig(song);
      const xml = toMusicXML(clip.notes.map((n: any) => ({ pitch:n.pitch, startTime:n.startTime, duration:n.duration, velocity:n.velocity })), { tempo:song?.tempo, num:ts.num, den:ts.den, partName:song.tracks[args.track_index].name || clip.name });
      return { success:true, data:{ xml, noteCount:clip.notes.length, filename:`${(clip.name || "score").replace(/[^a-z0-9]+/gi,"_")}.musicxml` } };
    }
  );

  reg.register({ name:"from_musicxml", description:"Import MusicXML into a new MIDI clip", category:"notation", parameters:{ xml:{type:"string",description:"MusicXML document",required:true}, track_index:{type:"number",description:"Existing track (omit = new)",required:false} } },
    async (args: any, song: any) => {
      if (!args.xml || !/score-partwise|<note/i.test(args.xml)) return { success:false, error:"Not a MusicXML document." };
      const parsed = fromMusicXML(String(args.xml));
      if (!parsed.notes.length) return { success:false, error:"No notes found in the MusicXML." };
      const track = args.track_index != null ? song.tracks[args.track_index] : await song.createMidiTrack();
      if (args.track_index == null) track.name = "Imported Score";
      const end = Math.max(4, ...parsed.notes.map((n) => n.startTime + n.duration));
      const clip = await track.createMidiClip(0, end);
      clip.name = "Imported Score";
      clip.notes = parsed.notes.map((n) => ({ pitch:n.pitch, startTime:n.startTime, duration:n.duration, velocity:n.velocity ?? 100 }));
      return { success:true, data:{ trackIndex:song.tracks.indexOf(track), clipName:clip.name, noteCount:parsed.notes.length, num:parsed.num, den:parsed.den } };
    }
  );

  return reg;
}
