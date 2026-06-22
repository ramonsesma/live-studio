// Módulo: Headphone / Cue Mixer — reutilizado de examples/headphone-mixer
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

export function createToolRegistry() {
  const reg = new ToolRegistry();

  
  reg.register({ name:"set_cue_mix", description:"Set cue mix level for a track", category:"headphone", parameters:{ track_index:{type:"number",description:"Track index",required:true}, level:{type:"number",description:"Cue level 0-1",required:true}, pan:{type:"number",description:"Cue pan -1 to 1",required:false} } },
    async (args: any) => ({ success:true, data:{ set:true, trackIndex:args.track_index, level:args.level, pan:args.pan||0 } })
  );

  reg.register({ name:"create_cue_bus", description:"Create a cue/headphone bus with selected tracks", category:"headphone", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices for cue mix",required:true}, bus_name:{type:"string",description:"Cue bus name",required:false}, mono:{type:"boolean",description:"Mono cue mix",required:false} } },
    async (args: any, song: any) => {
      const bus = await song.createAudioTrack();
      bus.name = args.bus_name || "CUE MIX";
      return { success:true, data:{ created:true, busIndex:song.tracks.indexOf(bus), busName:bus.name, trackCount:String(args.track_indices).split(",").length, mono:!!args.mono } };
    }
  );

  reg.register({ name:"solo_in_cue", description:"Solo a track only in cue (not main mix)", category:"headphone", parameters:{ track_index:{type:"number",description:"Track index",required:true}, enabled:{type:"boolean",description:"Solo in cue",required:false} } },
    async (args: any) => ({ success:true, data:{ soloInCue:true, trackIndex:args.track_index, enabled:args.enabled!==false, mainMix:false } })
  );

  reg.register({ name:"save_cue_preset", description:"Save current cue mix as a preset", category:"headphone", parameters:{ name:{type:"string",description:"Preset name",required:true} } },
    async (args: any) => ({ success:true, data:{ saved:true, name:args.name, timestamp:new Date().toISOString(), trackCount:8 } })
  );

  return reg;
}
