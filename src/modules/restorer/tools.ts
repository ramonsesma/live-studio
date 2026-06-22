// Módulo: Audio Restorer — reutilizado de examples/audio-restorer
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

  reg.register({ name:"analyze_noise", description:"Analyze audio for noise, clicks, and artifacts", category:"restore", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ trackName:track?.name||"Unknown", analysis:{ noiseFloor:-72, noiseProfile:"Broadband hiss (4-8kHz)", clicksFound:12, avgClickIntensity:0.3, sibilance:0.2, clipping:false, dcOffset:0.01, overallHealth:78 } } };
    }
  );

  reg.register({ name:"reduce_noise", description:"Apply noise reduction to audio clip", category:"restore", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, reduction_amount:{type:"number",description:"Noise reduction amount 0-100%",required:false}, learn_noise:{type:"boolean",description:"Learn noise profile from selection",required:false}, preserve_range:{type:"number",description:"Frequency range to preserve Hz",required:false} } },
    async (args: any) => ({ success:true, data:{ applied:true, trackIndex:args.track_index, clipIndex:args.clip_index, reduction:args.reduction_amount||60, noiseFloorReduction:`-${Math.round((args.reduction_amount||60)*0.4)}dB`, artifacts:0 } })
  );

  
  reg.register({ name:"de_esser", description:"Apply de-essing to reduce sibilance", category:"restore", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, frequency:{type:"number",description:"Sibilant frequency center Hz",required:false}, reduction:{type:"number",description:"Reduction amount dB",required:false} } },
    async (args: any) => ({ success:true, data:{ applied:true, frequency:args.frequency||6500, reduction:args.reduction||-6, sibilanceReduced:"4.2dB", naturalness:92 } })
  );

  
  return reg;
}
