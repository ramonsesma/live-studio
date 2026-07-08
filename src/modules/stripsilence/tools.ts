// Módulo: Strip Silence — the real work lives in the Bridge (registered via registry.addTool,
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
  reg.register({ name:"how_it_works", description:"How Strip Silence maps and trims a clip's real silence", category:"audio-utility", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "analyze_silence maps the clip's real RMS envelope into sound/silence regions (threshold + minimum-gap settings) without touching anything.",
      "trim_silence writes a new audio file with the lead/tail silence removed (mode lead_tail) or one file per sound region (mode split), with click-safe edge fades, and imports it into the project.",
      "The source clip is never modified — results are fresh files, so nothing is lost." ] } })
  );
  return reg;
}
