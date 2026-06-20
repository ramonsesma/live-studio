// Módulo: Crossfade Tool — reutilizado de examples/crossfade-tool
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

  reg.register({ name:"get_clips_in_range", description:"Detect overlapping clips that need crossfades", category:"crossfade", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ trackName:track?.name||"Unknown", overlappingPairs:[
        { clipA:"Clip 1", clipB:"Clip 2", overlapAmount:"2 bars", position:8, recommendedFade:"equal-power" },
        { clipA:"Clip 3", clipB:"Clip 4", overlapAmount:"1 bar", position:24, recommendedFade:"linear" }
      ]}};
    }
  );

  reg.register({ name:"apply_crossfade", description:"Apply crossfade between two clips", category:"crossfade", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_a:{type:"number",description:"First clip index",required:true}, clip_b:{type:"number",description:"Second clip index",required:true}, length:{type:"number",description:"Crossfade length in beats",required:false}, curve:{type:"string",description:"Fade curve",required:false,enum:["linear","equal-power","equal-gain","slow","fast","exponential","logarithmic"]}, symmetric:{type:"boolean",description:"Symmetric fade",required:false} } },
    async (args: any) => ({ success:true, data:{ applied:true, length:args.length||2, curve:args.curve||"equal-power", symmetric:args.symmetric!==false, trackIndex:args.track_index } })
  );

  reg.register({ name:"auto_crossfade", description:"Auto-create crossfades for all overlapping clips on track", category:"crossfade", parameters:{ track_index:{type:"number",description:"Track index",required:true}, default_length:{type:"number",description:"Default fade length in beats",required:false}, curve:{type:"string",description:"Default curve",required:false,enum:["linear","equal-power","equal-gain"]} } },
    async (args: any) => ({ success:true, data:{ autoApplied:true, trackIndex:args.track_index, fadesCreated:Math.floor(Math.random()*4)+2, defaultLength:args.default_length||2, curve:args.curve||"equal-power" } })
  );

  reg.register({ name:"remove_crossfades", description:"Remove all crossfades on a track", category:"crossfade", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any) => ({ success:true, data:{ removed:true, trackIndex:args.track_index, fadesRemoved:Math.floor(Math.random()*5)+1 } })
  );

  reg.register({ name:"get_fade_curves", description:"Get available fade curve types", category:"crossfade", parameters:{} },
    async () => ({ success:true, data:{ curves:[
      { name:"linear", desc:"Constant rate of change" },
      { name:"equal-power", desc:"Constant perceived loudness" },
      { name:"equal-gain", desc:"Constant sum of amplitudes" },
      { name:"slow", desc:"Slow start, fast end" },
      { name:"fast", desc:"Fast start, slow end" },
      { name:"exponential", desc:"Exponential curve" },
      { name:"logarithmic", desc:"Logarithmic curve" }
    ]}})
  );

  return reg;
}
