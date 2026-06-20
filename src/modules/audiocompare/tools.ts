// Módulo: Audio Comparer (A/B) — reutilizado de examples/audio-comparer
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

  reg.register({ name:"set_sources", description:"Set A and B sources for comparison", category:"comparer", parameters:{ track_a:{type:"number",description:"A source track index",required:true}, clip_a:{type:"number",description:"A clip index",required:false}, track_b:{type:"number",description:"B source track index",required:true}, clip_b:{type:"number",description:"B clip index",required:false} } },
    async (args: any, song: any) => {
      const a = song.tracks[args.track_a]; const b = song.tracks[args.track_b];
      return { success:true, data:{ sourcesSet:true, trackA:a?.name||"Unknown", trackB:b?.name||"Unknown", clipA:args.clip_a??"entire", clipB:args.clip_b??"entire" } };
    }
  );

  reg.register({ name:"switch_ab", description:"Switch between A and B sources", category:"comparer", parameters:{ active:{type:"string",description:"Active source",required:false,enum:["A","B"]} } },
    async (args: any) => ({ success:true, data:{ active:args.active||"A", crossfade:true } })
  );

  reg.register({ name:"analyze_diff", description:"Analyze spectral/temporal differences between A and B", category:"comparer", parameters:{} },
    async () => {
      const diffs = [
        { type:"spectral", description:"B has +3.2dB more in 200-500Hz range", magnitude:3.2 },
        { type:"temporal", description:"B is +12ms ahead, -8ms at end", magnitude:20 },
        { type:"dynamic", description:"B has 2.1dB more dynamic range", magnitude:2.1 }
      ];
      return { success:true, data:{ differences:diffs, overallSimilarity:76, loudnessDiff:"+1.4dB (B louder)" } };
    }
  );

  reg.register({ name:"sync_clips", description:"Sync A and B clips to same start position", category:"comparer", parameters:{ mode:{type:"string",description:"Sync mode",required:false,enum:["manual","transient","bar","beat"]} } },
    async (args: any) => ({ success:true, data:{ synced:true, mode:args.mode||"transient", offsetCorrected:"+340ms" } })
  );

  reg.register({ name:"export_comparison", description:"Export comparison report", category:"comparer", parameters:{ format:{type:"string",description:"Report format",required:false,enum:["text","json","csv"]} } },
    async () => ({ success:true, data:{ exported:true, format:"text", report:"A vs B Comparison\nLevel: +1.4dB\nFreq: +3.2dB @ 200-500Hz\nPhase: 12ms offset" } })
  );

  return reg;
}
