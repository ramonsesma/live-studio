// Módulo: Audio Quantizer — reutilizado de examples/audio-quantizer
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

  reg.register({ name:"analyze_timing", description:"Analyze audio clip timing against grid", category:"audio-quantize", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const transients = Array.from({length:16}, (_, i) => ({ index:i, time:i*0.25+Math.random()*0.05, offset:`${(Math.random()*20-10).toFixed(1)}ms`, amplitude:Math.random()*0.8+0.2 }));
      return { success:true, data:{ trackName:track.name, clipIndex:args.clip_index, bpm:song.tempo||120, transients, overallDrift:"+3.2ms", warpMarkersCount:transients.length } };
    }
  );

  reg.register({ name:"quantize_audio", description:"Quantize audio clip to grid using warp markers", category:"audio-quantize", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, strength:{type:"number",description:"Quantize strength 0-100%",required:false}, grid:{type:"string",description:"Grid resolution",required:false,enum:["1/4","1/8","1/16","1/32"]}, preserve_formant:{type:"boolean",description:"Preserve formants",required:false} } },
    async (args: any) => {
      const markersMoved = Math.floor(Math.random()*10)+5;
      return { success:true, data:{ quantized:true, strength:args.strength||80, grid:args.grid||"1/16", markersMoved, timingImprovement:`${Math.round(Math.random()*20+10)}ms avg error reduced` } };
    }
  );

  reg.register({ name:"set_warp_mode", description:"Set warp mode for audio clip", category:"audio-quantize", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, mode:{type:"string",description:"Warp mode",required:true,enum:["beats","tones","textures","re-pitch","complex","complex-pro"]} } },
    async (args: any) => ({ success:true, data:{ set:true, mode:args.mode, clipIndex:args.clip_index, trackIndex:args.track_index } })
  );

  reg.register({ name:"auto_warp", description:"Auto-detect tempo and warp audio clip", category:"audio-quantize", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, expected_bpm:{type:"number",description:"Expected BPM hint",required:false} } },
    async (args: any) => {
      const detectedBpm = Math.floor(Math.random()*40+100);
      return { success:true, data:{ autoWarped:true, detectedBpm, originalBpm:args.expected_bpm||"unknown", markersCreated:Math.floor(Math.random()*20+10), confidence:0.87 } };
    }
  );

  return reg;
}
