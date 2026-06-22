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

  
  
  
  
  return reg;
}
