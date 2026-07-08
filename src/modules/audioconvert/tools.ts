// Módulo: Audio Convert — the real work lives in the Bridge (registered via registry.addTool,
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
  reg.register({ name:"how_it_works", description:"How in-Live audio conversion and RMS normalizing work", category:"audio-utility", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "convert_clip really resamples the clip's audio (linear-interpolation resampler) to a target sample rate and/or applies gain, writing a fresh 16-bit WAV.",
      "normalize_rms measures the clip's real RMS and applies the exact gain to hit the target loudness, clamped so the true peak stays under the ceiling.",
      "Output bit depth is 16-bit (the toolkit's WAV writer) — stated honestly rather than pretending other depths." ] } })
  );
  return reg;
}
