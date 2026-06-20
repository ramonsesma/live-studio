// Módulo: Frequency Splitter — reutilizado de examples/frequency-splitter
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

  reg.register({ name:"set_split", description:"Set frequency split points and routing", category:"freq-split", parameters:{ track_index:{type:"number",description:"Track index",required:true}, crossover_low:{type:"number",description:"Low crossover frequency Hz (20-20000)",required:false}, crossover_mid:{type:"number",description:"Mid crossover frequency Hz (20-20000)",required:false}, bands:{type:"number",description:"Number of bands 2-4",required:false,enum:[2,3,4]} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ splitSet:true, trackName:track?.name||"Unknown", bands:args.bands||3, low:args.crossover_low||250, mid:args.crossover_mid||2000 } };
    }
  );

  reg.register({ name:"add_band_processing", description:"Add processing to a frequency band", category:"freq-split", parameters:{ track_index:{type:"number",description:"Track index",required:true}, band:{type:"number",description:"Band index (0=low,1=mid,2=high)",required:true}, device:{type:"string",description:"Device to add",required:true,enum:["compressor","eq","saturator","reverb","delay"]}, param_adjust:{type:"string",description:"Comma-separated param:value pairs",required:false} } },
    async (args: any) => ({ success:true, data:{ processingAdded:true, band:args.band, device:args.device, params:args.param_adjust||"" } })
  );

  reg.register({ name:"set_band_gain", description:"Set gain per frequency band", category:"freq-split", parameters:{ track_index:{type:"number",description:"Track index",required:true}, band_gains:{type:"string",description:"Comma-separated gains dB per band",required:true} } },
    async (args: any) => {
      const gains = String(args.band_gains).split(",").map(Number);
      return { success:true, data:{ gainsSet:true, bandCount:gains.length, gains } };
    }
  );

  reg.register({ name:"solo_band", description:"Solo a specific frequency band", category:"freq-split", parameters:{ track_index:{type:"number",description:"Track index",required:true}, band:{type:"number",description:"Band index to solo",required:true} } },
    async (args: any) => ({ success:true, data:{ bandSoloed:true, band:args.band, othersMuted:true } })
  );

  reg.register({ name:"collapse_bands", description:"Collapse/merge split bands back to single track", category:"freq-split", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any) => ({ success:true, data:{ collapsed:true, bandsRemoved:3, merged:true } })
  );

  return reg;
}
