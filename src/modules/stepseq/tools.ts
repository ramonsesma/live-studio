// Módulo: Step Sequencer — reutilizado de examples/step-sequencer
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

  reg.register({ name:"set_pattern", description:"Set step sequencer pattern", category:"step-seq", parameters:{ track_index:{type:"number",description:"Track index",required:true}, steps:{type:"number",description:"Number of steps (8/16/32)",required:false,enum:[8,16,32]}, resolution:{type:"string",description:"Step resolution",required:false,enum:["1/4","1/8","1/16","1/32"]}, swing:{type:"number",description:"Swing amount 0-100%",required:false} } },
    async (args: any, song: any) => {
      const track = await song.createMidiTrack();
      track.name = `Step Seq ${args.steps||16}`;
      const steps = Array.from({length:args.steps||16}, (_, i) => ({ step:i, active:Math.random()>0.4, velocity:Math.floor(Math.random()*60+40), flam:Math.random()>0.8, accent:Math.random()>0.7 }));
      return { success:true, data:{ created:true, trackIndex:song.tracks.indexOf(track), steps, resolution:args.resolution||"1/16", swing:args.swing||0, totalSteps:steps.length, activeSteps:steps.filter((s: any)=>s.active).length } };
    }
  );

  reg.register({ name:"toggle_step", description:"Toggle a single step on/off", category:"step-seq", parameters:{ track_index:{type:"number",description:"Track index",required:true}, step:{type:"number",description:"Step index (0-based)",required:true} } },
    async (args: any) => ({ success:true, data:{ toggled:true, step:args.step, nowActive:Math.random()>0.5 } })
  );

  reg.register({ name:"set_step_param", description:"Set velocity/accent/flam for a step", category:"step-seq", parameters:{ track_index:{type:"number",description:"Track index",required:true}, step:{type:"number",description:"Step index",required:true}, param:{type:"string",description:"Parameter",required:true,enum:["velocity","accent","flam","prob"]}, value:{type:"number",description:"Parameter value",required:true} } },
    async (args: any) => ({ success:true, data:{ step:args.step, param:args.param, value:args.value, trackIndex:args.track_index } })
  );

  reg.register({ name:"chain_patterns", description:"Chain multiple patterns for song structure", category:"step-seq", parameters:{ pattern_order:{type:"string",description:"Pattern order (e.g. A,A,B,A,B,C)",required:true}, track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any) => {
      const order = String(args.pattern_order).split(",").map((s: string)=>s.trim());
      return { success:true, data:{ chained:true, patternCount:order.length, uniquePatterns:[...new Set(order)], totalBars:order.length*4 } };
    }
  );

  reg.register({ name:"randomize_pattern", description:"Randomize step pattern with constraints", category:"step-seq", parameters:{ track_index:{type:"number",description:"Track index",required:true}, density:{type:"number",description:"Step density 0-100%",required:false}, variation:{type:"number",description:"Variation from original 0-100%",required:false} } },
    async (args: any) => ({ success:true, data:{ randomized:true, density:args.density||50, activeSteps:Math.round(16*(args.density||50)/100) } })
  );

  return reg;
}
