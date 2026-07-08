// Módulo: Reverse Verb — the real work lives in the Bridge (registered via registry.addTool,
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
  reg.register({ name:"how_it_works", description:"How the reverse-reverb swell is built from your clip", category:"audio-utility", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Takes the clip's REAL audio (unlike Riser/Reverse-Sweep, which synthesize new material), reverses it, runs a Schroeder reverb, and flips the tail back around.",
      "The result is the classic pre-verb swell that breathes INTO your sound; optionally the dry clip is appended after the swell.",
      "Written as a new file and imported — the original stays untouched." ] } })
  );
  return reg;
}
