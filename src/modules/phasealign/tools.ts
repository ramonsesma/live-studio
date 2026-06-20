// Módulo: Phase Aligner — reutilizado de examples/phase-aligner
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

  reg.register({ name:"analyze_phase", description:"Analyze phase between two tracks", category:"phase", parameters:{ track_a:{type:"number",description:"Track A index",required:true}, track_b:{type:"number",description:"Track B index",required:true} } },
    async (args: any, song: any) => {
      const a = song.tracks[args.track_a]; const b = song.tracks[args.track_b];
      return { success:true, data:{ trackA:a?.name||"Unknown", trackB:b?.name||"Unknown", correlation:0.92, phaseOffset:"+12 samples", polarity:"positive" } };
    }
  );

  reg.register({ name:"apply_alignment", description:"Apply phase alignment between tracks", category:"phase", parameters:{ track_a:{type:"number",description:"Track A index",required:true}, track_b:{type:"number",description:"Track B index",required:true}, method:{type:"string",description:"Alignment strategy",required:false,enum:["delay","polarity","both"]} } },
    async (args: any, song: any) => {
      const a = song.tracks[args.track_a]; const b = song.tracks[args.track_b];
      return { success:true, data:{ aligned:true, method:args.method||"both", trackA:a?.name||"Unknown", trackB:b?.name||"Unknown", shift:"+12 samples", polarityFlipped:false } };
    }
  );

  reg.register({ name:"set_tolerance", description:"Set phase tolerance threshold", category:"phase", parameters:{ tolerance:{type:"number",description:"Tolerance in samples",required:true} } },
    async (args: any) => ({ success:true, data:{ toleranceSet:true, tolerance:args.tolerance } })
  );

  reg.register({ name:"preview_alignment", description:"Preview phase alignment before committing", category:"phase", parameters:{ track_a:{type:"number",description:"Track A index",required:true}, track_b:{type:"number",description:"Track B index",required:true}, duration:{type:"number",description:"Preview duration seconds",required:false} } },
    async (args: any, song: any) => {
      const a = song.tracks[args.track_a]; const b = song.tracks[args.track_b];
      return { success:true, data:{ previewing:true, trackA:a?.name||"Unknown", trackB:b?.name||"Unknown", duration:args.duration||5 } };
    }
  );

  reg.register({ name:"get_report", description:"Get phase analysis report", category:"phase", parameters:{} },
    async () => ({ success:true, data:{ tracksAnalyzed:4, problematicPairs:[], summary:"All tracks well-aligned" } })
  );

  return reg;
}
