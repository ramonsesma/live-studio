// Módulo: Stereo & Imaging — reutilizado de examples/stereo-width-enhancer
export class ToolRegistry {
  private handlers = new Map();
  definitions: any[] = [];
  register(def: any, handler: any) { this.definitions.push(def); this.handlers.set(def.name, handler); }
  async execute(name: string, args: any, song: any) {
    const handler = this.handlers.get(name);
    if (!handler) return { success: false, error: `Unknown: ${name}` };
    try { return await handler(args, song); }
    catch (err: any) { return { success: false, error: err.message || String(err) }; }
  }
  getDefinitionsJson() { return this.definitions; }
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"analyze_stereo_field", description:"Analyze stereo field of a track", category:"analysis", parameters:{ track_index:{type:"number",description:"Track",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:`Track ${args.track_index} not found` };
      return { success:true, data:{
        trackIndex:args.track_index, trackName:track.name,
        stereoWidth:Math.random()*0.8, correlation:Math.random()*0.9,
        leftLevel:Math.random()*-6, rightLevel:Math.random()*-6,
        midSide:{ mid:Math.random()*-6, side:Math.random()*-12 },
        panInfo:{ pan:0, imbalance:"balanced" },
        suggestions:[
          { type:"widen", amount:0.3, method:"ms", reason:"Increase width" },
          { type:"narrow", amount:0.2, method:"eq", reason:"Tighten low end" }
        ]
      }};
    }
  );

  reg.register({ name:"apply_width_preset", description:"Apply stereo width preset", category:"width", parameters:{ track_index:{type:"number",description:"Track",required:true}, preset:{type:"string",description:"Preset",required:true,enum:["wide","narrow","mono","stereo","ms_enhance","center_focus"]} } },
    async (args: any) => {
      const presets: any = {
        wide: { width:1.5, type:"ms", description:"Max width" },
        narrow: { width:0.5, type:"ms", description:"Reduced width" },
        mono: { width:0, type:"ms", description:"Mono" },
        stereo: { width:1, type:"ms", description:"Normal stereo" },
        ms_enhance: { width:1.3, type:"ms", description:"Mid/Side enhancement" },
        center_focus: { width:0.8, type:"ms", description:"Focus center" }
      };
      const preset = presets[args.preset];
      if (!preset) return { success:false, error:`Unknown preset: ${args.preset}` };
      return { success:true, data:{ applied:true, preset:args.preset, params:preset, trackIndex:args.track_index } };
    }
  );

  reg.register({ name:"apply_mid_side", description:"Apply Mid/Side processing", category:"width", parameters:{ track_index:{type:"number",description:"Track",required:true}, mid_gain:{type:"number",description:"Mid gain dB",required:false}, side_gain:{type:"number",description:"Side gain dB",required:false}, side_eq:{type:"string",description:"Side EQ",required:false} } },
    async (args: any) => ({ success:true, data:{ applied:true, midGain:args.mid_gain||0, sideGain:args.side_gain||0, sideEq:args.side_eq||"none", trackIndex:args.track_index } })
  );

  reg.register({ name:"auto_pan", description:"Apply auto-pan effect", category:"width", parameters:{ track_index:{type:"number",description:"Track",required:true}, rate:{type:"number",description:"Rate Hz",required:false}, depth:{type:"number",description:"Depth 0-1",required:false}, waveform:{type:"string",description:"Waveform",required:false,enum:["sine","triangle","square","saw"]} } },
    async (args: any) => ({ success:true, data:{ applied:true, rate:args.rate||0.5, depth:args.depth||0.7, waveform:args.waveform||"sine", trackIndex:args.track_index } })
  );

  return reg;
}
