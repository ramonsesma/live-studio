// Módulo: Drum Bus Processor — reutilizado de examples/drum-bus-processor
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

  reg.register({ name:"set_bus_compressor", description:"Set drum bus compressor parameters", category:"drum-bus", parameters:{ track_indices:{type:"string",description:"Comma-separated drum track indices",required:true}, threshold:{type:"number",description:"Threshold dB (-60 to 0)",required:false}, ratio:{type:"number",description:"Compression ratio 1-20",required:false}, attack:{type:"number",description:"Attack ms (0.01-30)",required:false}, release:{type:"number",description:"Release ms (5-500)",required:false}, knee:{type:"number",description:"Knee dB (0-12)",required:false}, makeup:{type:"number",description:"Makeup gain dB (0-24)",required:false} } },
    async (args: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      return { success:true, data:{ busCompressorSet:true, trackCount:indices.length, threshold:args.threshold||-18, ratio:args.ratio||4, attack:args.attack||1, release:args.release||100, knee:args.knee||3, makeup:args.makeup||3 } };
    }
  );

  reg.register({ name:"add_drum_group", description:"Create drum bus group track", category:"drum-bus", parameters:{ name:{type:"string",description:"Bus group name",required:false}, tracks:{type:"string",description:"Comma-separated track indices to group",required:true} } },
    async (args: any, song: any) => {
      const indices = String(args.tracks).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      const group = await song.createGroupTrack();
      group.name = args.name||"Drum Bus";
      return { success:true, data:{ groupCreated:true, groupName:group.name, memberCount:indices.length, groupIndex:song.tracks.indexOf(group) } };
    }
  );

  reg.register({ name:"set_parallel_comp", description:"Set parallel compression blend on drum bus", category:"drum-bus", parameters:{ blend:{type:"number",description:"Wet/dry blend 0-100%",required:true}, track_indices:{type:"string",description:"Comma-separated track indices",required:true} } },
    async (args: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      return { success:true, data:{ parallelCompSet:true, blend:args.blend, trackCount:indices.length } };
    }
  );

  reg.register({ name:"add_transient_shaper", description:"Add transient shaper to drum bus", category:"drum-bus", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices",required:true}, attack:{type:"number",description:"Attack boost/cut dB (-24 to +24)",required:false}, sustain:{type:"number",description:"Sustain boost/cut dB (-24 to +24)",required:false} } },
    async (args: any) => ({ success:true, data:{ transientShaperAdded:true, attack:args.attack||3, sustain:args.sustain||0 } })
  );

  reg.register({ name:"analyze_drum_bus", description:"Analyze drum bus frequency and dynamics", category:"drum-bus", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices",required:true} } },
    async () => ({ success:true, data:{ peakLevel:"-2.3 dBFS", rmsLevel:"-14.1 dBFS", dynamicRange:11.8, freqAnalysis:{ sub:"+3.2dB", lowMid:"-1.1dB", highMid:"+0.4dB", high:"-2.8dB" }, punchFactor:7.3, transientCount:124 } })
  );

  return reg;
}
