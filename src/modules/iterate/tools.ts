// Módulo: Disintegrate — the real work lives in the Bridge (registered via registry.addTool,
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
  reg.register({ name:"how_it_works", description:"How disintegrative iteration degrades a sound pass by pass", category:"audio-utility", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Feeds the clip's real audio through a degrade chain (lofi bit/rate crush, soft saturation, smear, darkening low-pass) N times — each pass processes the previous pass's output.",
      "keep_every writes milestone files along the way so you can hear the decay trajectory, tape-generation style.",
      "Deterministic DSP (no randomness): the same settings always disintegrate the same way." ] } })
  );
  return reg;
}
