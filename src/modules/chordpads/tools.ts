// Módulo: Chord Pads — reutilizado de examples/chord-pads
// (Corregido bug del original: el parámetro `inversion` venía como arrow function.)
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

const CHORD_LIB: any = {
  major: { intervals:[0,4,7], name:"Major" },
  minor: { intervals:[0,3,7], name:"Minor" },
  dim: { intervals:[0,3,6], name:"Diminished" },
  aug: { intervals:[0,4,8], name:"Augmented" },
  sus2: { intervals:[0,2,7], name:"Sus2" },
  sus4: { intervals:[0,5,7], name:"Sus4" },
  maj7: { intervals:[0,4,7,11], name:"Major 7" },
  min7: { intervals:[0,3,7,10], name:"Minor 7" },
  dom7: { intervals:[0,4,7,10], name:"Dominant 7" },
  dim7: { intervals:[0,3,6,9], name:"Diminished 7" }
};
const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_chords", description:"Get available chord types", category:"chord-pads", parameters:{} },
    async () => ({ success:true, data:{ chords:Object.entries(CHORD_LIB).map(([k,v]: any)=>({ name:k, description:v.name, intervals:v.intervals })) } })
  );

  reg.register({ name:"set_pad", description:"Assign a chord to a pad", category:"chord-pads", parameters:{ pad_index:{type:"number",description:"Pad index 0-15",required:true}, root:{type:"string",description:"Root note",required:true,enum:NOTES}, chord_type:{type:"string",description:"Chord type",required:true,enum:Object.keys(CHORD_LIB)}, octave:{type:"number",description:"Octave (-2 to 2)",required:false}, voicing:{type:"string",description:"Voicing style",required:false,enum:["close","open","drop2","spread"]}, inversion:{type:"number",description:"Inversion 0-3",required:false} } },
    async (args: any) => ({ success:true, data:{ padAssigned:true, pad:args.pad_index, chord:`${args.root} ${args.chord_type}`, voicing:args.voicing||"close", inversion:args.inversion||0 } })
  );

  reg.register({ name:"trigger_pad", description:"Trigger a chord pad (simulate playing)", category:"chord-pads", parameters:{ pad_index:{type:"number",description:"Pad index to trigger",required:true}, velocity:{type:"number",description:"Velocity 0-127",required:false} } },
    async (args: any, song: any) => {
      const track = await song.createMidiTrack();
      track.name = `Chord Pad ${args.pad_index}`;
      const clip = await track.createMidiClip(0, 4);
      clip.name = `Pad ${args.pad_index} chord`;
      return { success:true, data:{ triggered:true, pad:args.pad_index, velocity:args.velocity||100, notesPlayed:3, trackIndex:song.tracks.indexOf(track) } };
    }
  );

  reg.register({ name:"set_layout", description:"Set pad layout grid size", category:"chord-pads", parameters:{ layout:{type:"string",description:"Pad grid layout",required:false,enum:["4x4","2x8","1x16","8x2"]}, label_mode:{type:"string",description:"Pad label mode",required:false,enum:["chord","root","roman","none"]} } },
    async (args: any) => ({ success:true, data:{ layoutSet:true, layout:args.layout||"4x4", labelMode:args.label_mode||"chord" } })
  );

  reg.register({ name:"set_fixed_velocity", description:"Enable fixed velocity for chord pads", category:"chord-pads", parameters:{ enabled:{type:"boolean",description:"Fixed velocity on/off",required:false}, velocity:{type:"number",description:"Fixed velocity value",required:false} } },
    async (args: any) => ({ success:true, data:{ fixedVelocity:args.enabled!==false, value:args.velocity||100 } })
  );

  return reg;
}
