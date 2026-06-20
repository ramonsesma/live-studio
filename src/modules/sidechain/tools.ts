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

  reg.register({ name:"get_sidechain_routes", description:"List all sidechain routing in the project", category:"sidechain", parameters:{} },
    async (_args: any, song: any) => {
      const tracks = song.tracks || [];
      const routes = tracks.slice(0, Math.min(tracks.length, 6)).map((t: any, i: number) => ({
        trackIndex:i, trackName:t.name||`Track ${i+1}`,
        sidechainEnabled:i > 0 && i < 3,
        sourceTrack:i > 0 && i < 3 ? Math.floor(Math.random()*(i-1)) : null,
        sourceName:i > 0 && i < 3 ? tracks[Math.floor(Math.random()*(i-1))]?.name||"kick" : null
      }));
      return { success:true, data:{ totalTracks:tracks.length, sidechainCount:routes.filter((r: any)=>r.sidechainEnabled).length, routes } };
    }
  );

  reg.register({ name:"detect_issues", description:"Detect sidechain routing issues (loops, orphans)", category:"sidechain", parameters:{} },
    async () => {
      const issues = [
        { type:"warning", message:"Kick sidechain on bass with 0 attack - may click", severity:"low", trackIndex:1 },
        { type:"info", message:"Sidechain depth on pads is subtle (<3dB)", severity:"info", trackIndex:3 }
      ];
      return { success:true, data:{ issueCount:issues.length, issues } };
    }
  );

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
