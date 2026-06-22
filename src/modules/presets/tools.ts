// Módulo: Device Preset Browser — reutilizado de examples/device-preset-browser
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

const PRESET_CATEGORIES: any = {
  synth: ["Analog","Digital","FM","Wavetable","Granular","Bass","Lead","Pad","Pluck"],
  fx: ["Reverb","Delay","Compressor","EQ","Filter","Distortion","Modulation","Dynamics"],
  instrument: ["Keys","Strings","Brass","Woodwind","Percussion","Synth Lead"],
  drums: ["Kick","Snare","Hi-Hat","Percussion","Electronic","Acoustic"]
};

export function createToolRegistry() {
  const reg = new ToolRegistry();

  
  reg.register({ name:"load_preset", description:"Load a device preset onto a track", category:"presets", parameters:{ preset_id:{type:"number",description:"Preset ID",required:true}, track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Target device index",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ presetLoaded:true, presetId:args.preset_id, trackName:track?.name||"Unknown", deviceIndex:args.device_index||0 } };
    }
  );

  reg.register({ name:"preview_preset", description:"Preview a preset with MIDI note", category:"presets", parameters:{ preset_id:{type:"number",description:"Preset ID",required:true}, note:{type:"number",description:"MIDI note to play (0-127)",required:false}, duration:{type:"number",description:"Preview duration seconds",required:false} } },
    async (args: any) => ({ success:true, data:{ previewing:true, presetId:args.preset_id, note:args.note||60, duration:args.duration||2 } })
  );

  reg.register({ name:"favorite_preset", description:"Mark/unmark preset as favorite", category:"presets", parameters:{ preset_id:{type:"number",description:"Preset ID",required:true}, favorite:{type:"boolean",description:"Favorite status",required:false} } },
    async (args: any) => ({ success:true, data:{ favorited:args.favorite !== false, presetId:args.preset_id } })
  );

  reg.register({ name:"get_preset_detail", description:"Get detailed preset info", category:"presets", parameters:{ preset_id:{type:"number",description:"Preset ID",required:true} } },
    async (args: any) => ({ success:true, data:{
      presetId:args.preset_id, name:"Analog Pad Warm", category:"Pad", deviceType:"synth",
      params:[{ name:"Cutoff", value:0.7 },{ name:"Resonance", value:0.3 },{ name:"Envelope", value:0.5 }],
      tags:["analog","warm","pad","atmospheric"], author:"Built-in", rating:4
    }})
  );

  return reg;
}
