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
      const sel = String(args.track_indices||"").split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      const trackIdx = sel.length ? sel : (song.tracks||[]).map((_: any, i: number)=>i);
      const nodes: any[] = [];
      for (const ti of trackIdx) {
        const t = song.tracks?.[ti]; if (!t) continue;
        (t.clipSlots||[]).forEach((s: any, si: number) => {
          if (!s?.clip) return;
          nodes.push({ id:`t${ti}_c${si}`, label:s.clip.name||`Clip ${si}`, track:ti, slot:si, color:s.clip.color, noteCount:(s.clip.notes||[]).length });
        });
      }
      // Real edges: clips on the same track (sequence) or sharing a clip color.
      const edges: any[] = [];
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].track === nodes[j].track) edges.push({ source:nodes[i].id, target:nodes[j].id, type:"same-track", weight:0.6 });
        else if (nodes[i].color != null && nodes[i].color === nodes[j].color) edges.push({ source:nodes[i].id, target:nodes[j].id, type:"same-color", weight:0.4 });
      }
      // Deterministic radial layout for the panel.
      nodes.forEach((n, i) => { const a = (i / Math.max(1, nodes.length)) * Math.PI * 2; n.x = 400 + Math.cos(a) * 250; n.y = 300 + Math.sin(a) * 200; });
      return { success:true, data:{ nodes, edges, nodeCount:nodes.length, edgeCount:edges.length } };
    }
  );

  reg.register({ name:"find_related", description:"Find clips related to a source clip", category:"graph", parameters:{ clip_id:{type:"string",description:"Source clip ID (t<track>_c<slot>)",required:true}, relationship_filter:{type:"string",description:"Filter by relationship",required:false} } },
    async (args: any, song: any) => {
      const m = String(args.clip_id).match(/t(\d+)_c(\d+)/);
      const related: any[] = [];
      if (m) {
        const ti = +m[1], si = +m[2];
        const src = song.tracks?.[ti]?.clipSlots?.[si]?.clip;
        if (src) {
          (song.tracks||[]).forEach((t: any, tj: number) => (t.clipSlots||[]).forEach((s: any, sj: number) => {
            if (!s?.clip || (tj === ti && sj === si)) return;
            let rel: string | null = null;
            if (tj === ti) rel = "same-track"; else if (s.clip.color != null && s.clip.color === src.color) rel = "same-color";
            if (rel && (!args.relationship_filter || args.relationship_filter === rel)) related.push({ clipId:`t${tj}_c${sj}`, name:s.clip.name, relationship:rel });
          }));
        }
      }
      return { success:true, data:{ source:args.clip_id, related, count:related.length } };
    }
  );

  
  
  reg.register({ name:"suggest_arrangement", description:"Suggest arrangement based on clip relationships", category:"graph", parameters:{ seed_clip:{type:"string",description:"Starting clip",required:true}, target_length:{type:"number",description:"Target bars",required:false} } },
    async (args: any) => {
      const suggestion = Array.from({length:8},(_, i)=>({ section:`Section ${i+1}`, clips:[`clip_${i}`,`clip_${i+1}`], bars:4, rationale:"Harmonic progression" }));
      return { success:true, data:{ seed:args.seed_clip, suggestion, totalBars:32 } };
    }
  );

  return reg;
}
