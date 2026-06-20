// Módulo: Arrangement Looper — reutilizado de examples/arrangement-looper
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

  reg.register({ name:"set_loop_section", description:"Set a loop region in arrangement view", category:"arr-looper", parameters:{ start_bar:{type:"number",description:"Loop start bar",required:true}, end_bar:{type:"number",description:"Loop end bar",required:true}, crossfade:{type:"number",description:"Crossfade length in beats",required:false}, name:{type:"string",description:"Loop section name",required:false} } },
    async (args: any) => ({ success:true, data:{ loopSet:true, startBar:args.start_bar, endBar:args.end_bar, duration:`${args.end_bar-args.start_bar} bars`, crossfade:args.crossfade||0, name:args.name||"Loop Section" } })
  );

  reg.register({ name:"toggle_loop", description:"Toggle arrangement loop on/off", category:"arr-looper", parameters:{ enabled:{type:"boolean",description:"Enable loop",required:false} } },
    async () => ({ success:true, data:{ toggled:true, isLooping:true } })
  );

  reg.register({ name:"get_loop_regions", description:"Get defined loop regions", category:"arr-looper", parameters:{} },
    async () => ({ success:true, data:{ regions:[
      { name:"Verse Loop", startBar:9, endBar:24, active:true, crossfade:2 },
      { name:"Chorus Practice", startBar:25, endBar:40, active:false, crossfade:0 }
    ]}})
  );

  reg.register({ name:"loop_with_transition", description:"Loop a section with transition effect at loop point", category:"arr-looper", parameters:{ start_bar:{type:"number",description:"Loop start bar",required:true}, end_bar:{type:"number",description:"Loop end bar",required:true}, transition:{type:"string",description:"Transition type at loop point",required:false,enum:["none","filter-sweep","reverse","beat-repeat","volume-dip","fade"]}, transition_length:{type:"number",description:"Transition length in beats",required:false} } },
    async (args: any) => ({ success:true, data:{ loopWithTransition:true, startBar:args.start_bar, endBar:args.end_bar, transition:args.transition||"none", transitionLength:args.transition_length||2 } })
  );

  reg.register({ name:"loop_record", description:"Record arrangement playback into a clip", category:"arr-looper", parameters:{ loop_start:{type:"number",description:"Loop start bar",required:true}, loop_end:{type:"number",description:"Loop end bar",required:true}, target_track:{type:"number",description:"Target track index to record into",required:true} } },
    async (args: any) => ({ success:true, data:{ recording:true, loopStart:args.loop_start, loopEnd:args.loop_end, targetTrack:args.target_track, status:"Recording in 4 beats..." } })
  );

  return reg;
}
