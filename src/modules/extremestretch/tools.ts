// Módulo: Extreme Stretch — the real work lives in the Bridge (registered via registry.addTool,
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
  reg.register({ name:"how_it_works", description:"How the extreme granular freeze-stretch works", category:"audio-utility", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Our own grain engine (not a port): long Hann-windowed grains are sourced with seeded jitter and overlap-added at a slowed output hop.",
      "Factors from 2x to 200x with zero pitch shift — at high factors the material smears into an evolving pad/drone.",
      "Same seed = identical result (deterministic); the stretched audio is written as a new file and imported." ] } })
  );
  return reg;
}
