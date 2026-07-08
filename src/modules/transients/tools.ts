// Módulo: Transient Tools — the real work lives in the Bridge (registered via registry.addTool,
// see Bridge.registerBridgeTools), because it needs clip audio access. This shell provides
// the module identity + a how-it-works reference tool.
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
  reg.register({ name:"how_it_works", description:"How the transient detector, slicer and non-warp audio quantizer work", category:"audio-utility", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "detect_transients runs the same real onset detector loopdetect uses internally and returns each hit's time (sec + beats) and strength.",
      "slice_at_transients cuts the audio at those hits into per-hit files (like Tab-to-Transient slicing) and imports them.",
      "quantize_audio shifts each inter-onset segment onto the tempo grid (strength 0-100%) and rebuilds ONE new file with short crossfades — audio quantizing without Live's Warp engine." ] } })
  );
  return reg;
}
