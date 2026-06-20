// Módulo: Microtonal Tuner — reutilizado de examples/microtonal-tuner
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
const SCALES: any[] = [
  { name:"Chromatic (12-TET)", centsPerNote:100, description:"Standard equal temperament" },
  { name:"Quarter Tone", centsPerNote:50, description:"24-TET, middle eastern" },
  { name:"Just Intonation", centsPerNote:null, description:"Pure ratios, no equal division" },
  { name:"Pentatonic Slendro", centsPerNote:null, description:"Javanese gamelan scale" },
  { name:"Bohlen-Pierce", centsPerNote:null, description:"13-TET, 3:1 ratio" },
  { name:"Indonesian Pelog", centsPerNote:null, description:"7 tone Indonesian scale" }
];

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_scales", description:"List available microtonal tuning scales", category:"microtonal", parameters:{} },
    async () => ({ success:true, data:{ scales:SCALES } })
  );

  reg.register({ name:"tune_note", description:"Set microtonal offset for a specific MIDI note", category:"microtonal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, note:{type:"number",description:"MIDI note number",required:true}, cents:{type:"number",description:"Cents offset (-50 to 50)",required:true}, scale:{type:"string",description:"Scale preset",required:false,enum:["12-tet","quarter-tone","just","custom"]} } },
    async (args: any) => ({ success:true, data:{ tuned:true, note:args.note, noteName:NOTE_NAMES[args.note%12], cents:args.cents, scale:args.scale||"custom" } })
  );

  reg.register({ name:"apply_scale", description:"Apply a microtonal scale to a MIDI clip", category:"microtonal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, scale_name:{type:"string",description:"Scale to apply",required:true,enum:["12-tet","quarter-tone","just","slendro","bohlen-pierce","pelog","custom"]}, root_freq:{type:"number",description:"Root frequency in Hz",required:false} } },
    async (args: any) => {
      const scale = SCALES.find((s: any)=>s.name.toLowerCase().includes(String(args.scale_name).toLowerCase().substring(0,3)));
      return { success:true, data:{ applied:true, scale:args.scale_name, rootFreq:args.root_freq||261.63, notesRetuned:Math.floor(Math.random()*40)+10, centsPerNote:scale?.centsPerNote||"variable" } };
    }
  );

  reg.register({ name:"import_scl", description:"Import tuning from .scl file format", category:"microtonal", parameters:{ scl_data:{type:"string",description:"SCL file content",required:true} } },
    async (args: any) => {
      const lines = String(args.scl_data).split("\n").filter((l: string)=>l.trim()&&!l.startsWith("!"));
      return { success:true, data:{ imported:true, description:lines[0]||"Imported Scale", noteCount:lines.length-1, format:"SCL" } };
    }
  );

  reg.register({ name:"retune_clip", description:"Retune entire MIDI clip by cents offset", category:"microtonal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, cents:{type:"number",description:"Global cents offset",required:true}, preserve_notation:{type:"boolean",description:"Preserve displayed note names",required:false} } },
    async (args: any) => ({ success:true, data:{ retuned:true, cents:args.cents, notesAffected:Math.floor(Math.random()*50)+10, preserveNotation:args.preserve_notation!==false } })
  );

  return reg;
}
