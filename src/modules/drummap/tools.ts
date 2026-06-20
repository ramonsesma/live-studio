// Módulo: Drum Map Editor — reutilizado de examples/drum-map-editor
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
const GM_DRUM_MAP: any = { 36:"Kick", 38:"Snare", 42:"Closed Hi-Hat", 46:"Open Hi-Hat", 39:"Clap", 41:"Floor Tom", 43:"High Tom", 45:"Mid Tom", 47:"Low Tom", 49:"Crash", 51:"Ride", 56:"Cowbell", 76:"Hi Conga", 77:"Mid Conga", 78:"Low Conga" };

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_drum_rack", description:"Get drum rack info from a track", category:"drum-map", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const pads = Object.entries(GM_DRUM_MAP).slice(0,8).map(([note,name]: any) => ({
        note:Number(note), noteName:NOTE_NAMES[Number(note)%12], name,
        color:`hsl(${Math.random()*360},70%,60%)`, output:"Master", mute:false, solo:false
      }));
      return { success:true, data:{ trackName:track.name, padCount:pads.length, pads } };
    }
  );

  reg.register({ name:"set_drum_mapping", description:"Set a drum pad's MIDI note mapping", category:"drum-map", parameters:{ track_index:{type:"number",description:"Track index",required:true}, pad_index:{type:"number",description:"Pad index",required:true}, note:{type:"number",description:"MIDI note number (0-127)",required:true}, name:{type:"string",description:"Pad display name",required:false}, color:{type:"string",description:"Pad color hex",required:false} } },
    async (args: any) => ({ success:true, data:{ mapped:true, trackIndex:args.track_index, padIndex:args.pad_index, newNote:args.note, noteName:NOTE_NAMES[args.note%12], name:args.name||GM_DRUM_MAP[args.note]||"Custom", color:args.color||"#667eea" } })
  );

  reg.register({ name:"set_output_routing", description:"Route a drum pad to a specific output channel", category:"drum-map", parameters:{ track_index:{type:"number",description:"Track index",required:true}, pad_index:{type:"number",description:"Pad index",required:true}, output:{type:"string",description:"Output routing",required:true,enum:["master","sends-only","ext-out-1","ext-out-2","ext-out-3","ext-out-4"]} } },
    async (args: any) => ({ success:true, data:{ routed:true, output:args.output, trackIndex:args.track_index, padIndex:args.pad_index } })
  );

  reg.register({ name:"load_drum_map_preset", description:"Load a standard drum map preset", category:"drum-map", parameters:{ preset:{type:"string",description:"Drum map preset",required:true,enum:["GM Standard","Ableton Core","808 Kit","909 Kit","Acoustic","Electronic","Custom"]} } },
    async (args: any) => ({ success:true, data:{ loaded:true, preset:args.preset, pads:12, mappingType:"note-to-slot" } })
  );

  reg.register({ name:"export_drum_map", description:"Export drum map as JSON/CSV", category:"drum-map", parameters:{ format:{type:"string",description:"Export format",required:false,enum:["json","csv","ableton"]} } },
    async (args: any) => ({ success:true, data:{ exported:true, format:args.format||"json", map:GM_DRUM_MAP } })
  );

  return reg;
}
