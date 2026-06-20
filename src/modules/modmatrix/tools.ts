// Módulo: Modulation Matrix — reutilizado de examples/modulation-matrix
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

  reg.register({ name:"get_matrix", description:"Get the modulation matrix for a track", category:"mod-matrix", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      const routings = Array.from({length:5}, (_, i) => ({
        id:i+1, source:["LFO 1","LFO 2","Env 1","Vel->Flt","Key->Pan"][i],
        target:["Cutoff","Volume","Resonance","Pan","Filter Env"][i],
        depth:[50,30,80,100,40][i], bipolar:[true,false,true,false,true][i], enabled:true
      }));
      return { success:true, data:{ trackName:track?.name||"Unknown", routings, totalRoutings:routings.length, freeSlots:3 } };
    }
  );

  reg.register({ name:"add_modulation", description:"Add a new modulation routing", category:"mod-matrix", parameters:{ track_index:{type:"number",description:"Track index",required:true}, source:{type:"string",description:"Modulation source",required:true,enum:["lfo1","lfo2","env1","env2","velocity","key","random","expression","breath"]}, target:{type:"string",description:"Target parameter path",required:true}, depth:{type:"number",description:"Modulation depth 0-100%",required:false}, bipolar:{type:"boolean",description:"Bipolar modulation",required:false} } },
    async (args: any) => ({ success:true, data:{ routingAdded:true, source:args.source, target:args.target, depth:args.depth||50, bipolar:args.bipolar||false } })
  );

  reg.register({ name:"remove_modulation", description:"Remove a modulation routing", category:"mod-matrix", parameters:{ track_index:{type:"number",description:"Track index",required:true}, routing_id:{type:"number",description:"Routing ID to remove",required:true} } },
    async (args: any) => ({ success:true, data:{ routingRemoved:true, routingId:args.routing_id } })
  );

  reg.register({ name:"set_modulation_depth", description:"Set modulation depth for a routing", category:"mod-matrix", parameters:{ track_index:{type:"number",description:"Track index",required:true}, routing_id:{type:"number",description:"Routing ID",required:true}, depth:{type:"number",description:"Depth 0-100%",required:true} } },
    async (args: any) => ({ success:true, data:{ depthSet:true, routingId:args.routing_id, depth:args.depth } })
  );

  reg.register({ name:"toggle_modulation", description:"Enable/disable a modulation routing", category:"mod-matrix", parameters:{ track_index:{type:"number",description:"Track index",required:true}, routing_id:{type:"number",description:"Routing ID",required:true}, enabled:{type:"boolean",description:"Enabled state",required:false} } },
    async (args: any) => ({ success:true, data:{ toggled:true, routingId:args.routing_id, enabled:args.enabled !== false } })
  );

  return reg;
}
