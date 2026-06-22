// Módulo: Sidechain — reutilizado de examples/sidechain-visualizer
export class ToolRegistry {
  private handlers = new Map();
  definitions: any[] = [];
  register(def: any, handler: any) { this.definitions.push(def); this.handlers.set(def.name, handler); }
  async execute(name: string, args: any, song: any) {
    const handler = this.handlers.get(name);
    if (!handler) return { success: false, error: `Unknown: ${name}` };
    try { return await handler(args, song); }
    catch (err: any) { return { success: false, error: err.message || String(err) }; }
  }
  getDefinitionsJson() { return this.definitions; }
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  
  
  reg.register({ name:"visualize_routing", description:"Get sidechain routing as a graph/connections array", category:"sidechain", parameters:{} },
    async (_args: any, song: any) => {
      const tracks = song.tracks || [];
      const nodes = tracks.map((t: any, i: number)=>({ id:i, label:t.name||`Track ${i+1}`, type:i===0?"source":"track" }));
      const edges = [
        { from:0, to:1, label:"Sidechain", type:"sidechain", depth:"100%" },
        { from:0, to:2, label:"Sidechain", type:"sidechain", depth:"75%" }
      ];
      return { success:true, data:{ nodes, edges } };
    }
  );

  reg.register({ name:"set_sidechain", description:"Configure sidechain between tracks", category:"sidechain", parameters:{ track_index:{type:"number",description:"Target track index",required:true}, source_index:{type:"number",description:"Source track index",required:true}, depth:{type:"number",description:"Sidechain depth percentage 0-100",required:false}, attack:{type:"number",description:"Attack time in ms",required:false}, release:{type:"number",description:"Release time in ms",required:false} } },
    async (args: any) => ({ success:true, data:{ configured:true, trackIndex:args.track_index, sourceIndex:args.source_index, depth:args.depth||80, attack:args.attack||1, release:args.release||100 } })
  );

  return reg;
}
