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

  reg.register({ name:"analyze_spectrum", description:"Get real-time spectrum data", category:"spectrogram", parameters:{ track_index:{type:"number",description:"Track index",required:true}, fft_size:{type:"number",description:"FFT size (256/512/1024/2048)",required:false,enum:[256,512,1024,2048]}, window:{type:"string",description:"Window function",required:false,enum:["hann","hamming","blackman","kaiser"]} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      const bins = Array.from({length:128}, (_, i) => ({ freq:Math.round(20*Math.pow(2,i/10.5)), magnitude:Math.random(), phase:Math.random()*Math.PI*2, peak:Math.random()>0.95 }));
      return { success:true, data:{ trackName:track?.name||"Unknown", fftSize:args.fft_size||1024, window:args.window||"hann", bins, sampleRate:44100 } };
    }
  );

  reg.register({ name:"get_waterfall", description:"Get waterfall spectrogram data (time slices)", category:"spectrogram", parameters:{ track_index:{type:"number",description:"Track index",required:true}, slices:{type:"number",description:"Number of time slices",required:false} } },
    async (args: any) => {
      const n = args.slices||20;
      const slices = Array.from({length:n}, (_, t) => ({
        time:`T-${(n-t)*100}ms`, bins:Array.from({length:64}, (_, f) => ({ freq:Math.round(20*Math.pow(2,f/8)), magnitude:Math.random() }))
      }));
      return { success:true, data:{ sliceCount:slices.length, fftHop:256, timeRange:`${n*256/44100*1000}ms`, slices } };
    }
  );

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
