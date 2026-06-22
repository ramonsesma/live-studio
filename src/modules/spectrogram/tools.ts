// Módulo: Spectrogram — reutilizado de examples/spectrogram
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

  
  
  reg.register({ name:"get_peaks", description:"Get spectral peaks and harmonics", category:"spectrogram", parameters:{ track_index:{type:"number",description:"Track index",required:true}, peak_count:{type:"number",description:"Number of peaks",required:false} } },
    async (args: any) => {
      const peaks = Array.from({length:args.peak_count||10}, (_, i) => ({ freq:Math.round(100*Math.pow(1.5,i)), magnitude:1-i*0.08, harmonic:i===0?null:`${i+1}x fundamental` }));
      return { success:true, data:{ peakCount:peaks.length, fundamentalFreq:peaks[0]?.freq||440, peaks } };
    }
  );

  reg.register({ name:"set_hold", description:"Toggle peak hold / freeze", category:"spectrogram", parameters:{ enabled:{type:"boolean",description:"Enable peak hold",required:false}, duration:{type:"number",description:"Hold duration seconds",required:false} } },
    async (args: any) => ({ success:true, data:{ hold:args.enabled!==false, duration:args.duration||2, frozen:false } })
  );

  return reg;
}
