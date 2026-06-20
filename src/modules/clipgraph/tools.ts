// Módulo: Clip Relation Graph — reutilizado de examples/clip-relation-graph
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

  reg.register({ name:"build_graph", description:"Build clip relationship graph", category:"graph", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices or 'all'",required:false}, relationship_types:{type:"string",description:"Comma-separated: follows,similar,derived,copied,harmonic",required:false} } },
    async (args: any, song: any) => {
      const tracks = (args.track_indices||"").split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      const nodes = (tracks.length?tracks:(song.tracks||[]).slice(0,4).map((_: any, i: number)=>i)).map((i: number)=>({ id:`clip_${i}`, label:`Clip ${i}`, track:i, x:Math.random()*800, y:Math.random()*600 }));
      const edges = nodes.slice(0,-1).map((n: any, i: number)=>({ source:n.id, target:nodes[i+1].id, type:["follows","similar","harmonic"][i%3], weight:0.5+Math.random()*0.5 }));
      return { success:true, data:{ nodes, edges, nodeCount:nodes.length, edgeCount:edges.length } };
    }
  );

  reg.register({ name:"find_related", description:"Find clips related to a source clip", category:"graph", parameters:{ clip_id:{type:"string",description:"Source clip ID",required:true}, max_distance:{type:"number",description:"Max graph distance",required:false}, relationship_filter:{type:"string",description:"Filter by relationship",required:false} } },
    async (args: any) => {
      const related = Array.from({length:5},(_, i)=>({ clipId:`clip_${i+10}`, relationship:["follows","similar","harmonic","derived","copied"][i], strength:0.5+Math.random()*0.5 }));
      return { success:true, data:{ source:args.clip_id, related, count:related.length } };
    }
  );

  reg.register({ name:"detect_patterns", description:"Detect recurring clip patterns", category:"graph", parameters:{ min_occurrences:{type:"number",description:"Minimum occurrences",required:false}, pattern_length:{type:"number",description:"Pattern length in bars",required:false} } },
    async (args: any) => {
      const patterns = Array.from({length:3},(_, i)=>({ id:`pat_${i}`, occurrences:3+i, length:args.pattern_length||4, clips:[`clip_${i}`,`clip_${i+5}`,`clip_${i+10}`], type:["rhythmic","melodic","harmonic"][i] }));
      return { success:true, data:{ patterns, totalPatterns:patterns.length } };
    }
  );

  reg.register({ name:"visualize_graph", description:"Export graph for visualization", category:"graph", parameters:{ format:{type:"string",description:"Output format",required:false,enum:["graphml","json","dot"]}, layout:{type:"string",description:"Layout algorithm",required:false,enum:["force","hierarchical","circular"]} } },
    async (args: any) => ({ success:true, data:{ exported:true, format:args.format||"json", layout:args.layout||"force", nodeCount:24, edgeCount:31 } })
  );

  reg.register({ name:"suggest_arrangement", description:"Suggest arrangement based on clip relationships", category:"graph", parameters:{ seed_clip:{type:"string",description:"Starting clip",required:true}, target_length:{type:"number",description:"Target bars",required:false} } },
    async (args: any) => {
      const suggestion = Array.from({length:8},(_, i)=>({ section:`Section ${i+1}`, clips:[`clip_${i}`,`clip_${i+1}`], bars:4, rationale:"Harmonic progression" }));
      return { success:true, data:{ seed:args.seed_clip, suggestion, totalBars:32 } };
    }
  );

  return reg;
}
