// Módulo: Clip Audio Editor — the real work lives in the Bridge (registered via registry.addTool,
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
  reg.register({ name:"how_it_works", description:"How the sample-level clip region editor works", category:"audio-utility", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "edit_region operates on the clip's real audio at millisecond precision: trim_to keeps only the region; silence zeroes it (with ramps); gain scales it; fade_in/fade_out shape it.",
      "The result is written as a new file and imported — the original clip and its sample stay untouched.",
      "Pair with stripsilence__analyze_silence or transients__detect_transients to find the exact ms positions to edit." ] } })
  );
  return reg;
}
