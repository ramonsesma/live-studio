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
      const notes = Array.from({length:20}, (_, i) => {
        const pitch = Math.floor(Math.random()*24)+60;
        return { note:NOTE_NAMES[pitch%12]+Math.floor(pitch/12-1), pitch, start:i*0.5, duration:Math.random()>0.5?0.5:1, velocity:Math.floor(Math.random()*40)+60 };
      });
      return { success:true, data:{ trackName:track.name, noteCount:notes.length, timeSignature:"4/4", keySignature:"C major", clef:"treble", notes } };
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

  reg.register({ name:"export_pdf", description:"Export notation score as PDF", category:"notation", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, title:{type:"string",description:"Score title",required:false}, include_metadata:{type:"boolean",description:"Include project metadata",required:false} } },
    async (args: any) => ({ success:true, data:{ exported:true, format:"PDF", pages:2, title:args.title||"Untitled Score", filename:`score_${args.track_index}_${args.clip_index}.pdf` } })
  );

  reg.register({ name:"transpose_score", description:"Transpose displayed notation", category:"notation", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, semitones:{type:"number",description:"Semitones to transpose",required:true} } },
    async (args: any) => ({ success:true, data:{ transposed:true, by:args.semitones, newKey:`${NOTE_NAMES[(NOTE_NAMES.indexOf("C")+args.semitones+1200)%12]} major` } })
  );

  return reg;
}
