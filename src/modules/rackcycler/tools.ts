// Módulo: Rack Preset Cycler — reutilizado de examples/rack-preset-cycler
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
  const chainOrder: any[] = [];

  reg.register({ name:"cycle_next", description:"Switch to the next chain in the rack", category:"rack-cycler", parameters:{ track_index:{type:"number",description:"Track index",required:true}, rack_index:{type:"number",description:"Rack device index",required:false}, wrap:{type:"boolean",description:"Wrap around at end",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      const currentIdx = chainOrder.length % 4;
      const nextIdx = (currentIdx + 1) % 4;
      return { success:true, data:{ cycled:true, trackName:track?.name||"Unknown", previousChain:currentIdx, currentChain:nextIdx, chainName:["Pad","Lead","Bass","FX"][nextIdx], wrap:args.wrap !== false } };
    }
  );

  reg.register({ name:"cycle_prev", description:"Switch to the previous chain", category:"rack-cycler", parameters:{ track_index:{type:"number",description:"Track index",required:true}, rack_index:{type:"number",description:"Rack device index",required:false}, wrap:{type:"boolean",description:"Wrap around",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ cycled:true, trackName:track?.name||"Unknown", previousChain:1, currentChain:0, chainName:"Pad", wrap:args.wrap !== false } };
    }
  );

  reg.register({ name:"set_chain", description:"Jump to a specific chain by index or name", category:"rack-cycler", parameters:{ track_index:{type:"number",description:"Track index",required:true}, chain_name:{type:"string",description:"Chain name or index",required:true}, rack_index:{type:"number",description:"Rack device index",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ chainSet:true, trackName:track?.name||"Unknown", chain:args.chain_name, rackIndex:args.rack_index||0 } };
    }
  );

  reg.register({ name:"auto_cycle", description:"Auto-cycle through chains at interval", category:"rack-cycler", parameters:{ track_index:{type:"number",description:"Track index",required:true}, interval:{type:"number",description:"Interval in bars",required:false,enum:[1,2,4,8,16]}, enabled:{type:"boolean",description:"Auto-cycle on/off",required:false}, random_mode:{type:"boolean",description:"Random vs sequential",required:false} } },
    async (args: any) => ({ success:true, data:{ autoCycleSet:true, interval:args.interval||4, enabled:args.enabled !== false, random:args.random_mode||false } })
  );

  reg.register({ name:"get_chains", description:"List all chains in the rack", category:"rack-cycler", parameters:{ track_index:{type:"number",description:"Track index",required:true}, rack_index:{type:"number",description:"Rack device index",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      const chains = ["Pad","Lead","Bass","FX","Arp","Sub"].map((n,i) => ({ index:i, name:n, active:i===0, color:["#667eea","#764ba2","#48bb78","#f56565","#ed8936","#4299e1"][i] }));
      return { success:true, data:{ rackName:track?.name || "Instrument Rack", trackName:track?.name, chainCount:chains.length, activeChain:chains[0].name, chains } };
    }
  );

  return reg;
}
