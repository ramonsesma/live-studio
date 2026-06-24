// Módulo: Spectrum Match — compares the frequency spectrum of two tracks (render→FFT) to
// reveal where they overlap/mask. A focused 2-track view of the Resonance engine; the panel
// drives it via /api/listen (one render per track). This tool documents it for the copilot.
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

  reg.register({ name:"how_to_compare", description:"How Spectrum Match compares two tracks' frequency content", category:"analysis", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Open the Spectrum Match panel and pick track A and track B — each is rendered and FFT-analyzed.",
      "The two spectra are overlaid; bands where BOTH are loud are highlighted as overlap (potential masking).",
      "Use it to make sure two instruments aren't fighting for the same frequency range before EQ'ing.",
      "It reuses the Resonance Listen pipeline (POST /api/listen { trackIndex }) once per track." ] } })
  );

  return reg;
}
