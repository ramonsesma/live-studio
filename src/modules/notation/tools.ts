// Módulo: Notation Viewer — reutilizado de examples/notation-viewer
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
      const ts = Array.isArray(song.timeSignature) ? song.timeSignature.join("/") : "4/4";
      return { success:true, data:{ trackName:track.name, noteCount:notes.length, timeSignature:ts, keySignature:key, clef:"treble", notes } };
    }
  );

  reg.register({ name:"get_score", description:"Get notation score as structured data", category:"notation", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, include_rests:{type:"boolean",description:"Include rest symbols",required:false}, beam:{type:"string",description:"Beaming style",required:false,enum:["auto","grouped","none"]} } },
    async (args: any) => {
      const measures = Array.from({length:8}, (_, i) => ({
        measure:i+1, beats:4, notes:[
          { symbol:"quarter", pitch:"C4", accidental:null, dot:false },
          { symbol:"eighth", pitch:"E4", accidental:null, dot:false },
          { symbol:"eighth", pitch:"G4", accidental:null, dot:false },
          { symbol:"quarter", pitch:"C5", accidental:null, dot:false }
        ]
      }));
      return { success:true, data:{ trackIndex:args.track_index, clipIndex:args.clip_index, measures, totalMeasures:8, resolution:"1/16" } };
    }
  );

  
  reg.register({ name:"transpose_score", description:"Transpose displayed notation", category:"notation", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, semitones:{type:"number",description:"Semitones to transpose",required:true} } },
    async (args: any) => ({ success:true, data:{ transposed:true, by:args.semitones, newKey:`${NOTE_NAMES[(NOTE_NAMES.indexOf("C")+args.semitones+1200)%12]} major` } })
  );

  return reg;
}
