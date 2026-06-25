// Módulo: Warp Mode A/B Comparator — renders a clip through each of Live's 6 warp modes so
// you can blind-test them by ear, then writes the winning warpMode. Heavy work in the Bridge.
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
  reg.register({ name:"how_warp_compare_works", description:"How the Warp Mode A/B Comparator works", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Open the Warp Compare panel on an audio clip — it sets each of the 6 warp modes (Beats, Tones, Texture, Repitch, Complex, Complex Pro) in turn and renders the clip to a WAV.",
      "The webview plays the 6 renders side by side so you choose by ear; Apply writes the winning warpMode (warp markers are read-only, but warpMode is settable).",
      "Most producers reach for Beats out of habit — this proves whether Texture or Complex actually sounds better.",
      "Programmatic entry: POST /api/warpcompare { trackIndex, clipIndex?, applyMode? } (or { demo:true })." ] } })
  );
  return reg;
}
