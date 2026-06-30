// Módulo: Acid Engine — synthesizes a TB-303-style acid bassline in-host (src/core/acid303.ts):
// resonant saw with a per-note filter envelope, accent and slide, imported as a new clip.
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
  reg.register({ name:"how_acid_works", description:"How the Acid Engine makes a 303-style line", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "A sawtooth runs through a resonant low-pass whose cutoff is swept by a per-note envelope — the squelch.",
      "Accent boosts the envelope/cutoff on certain steps; slide glides the pitch between notes (the rubbery 303 feel).",
      "Resonance, env mod, decay and drive shape it from acid bass to screaming lead.",
      "Audition the line in the panel, then import it as a tempo-matched clip.",
      "Programmatic entry: POST /api/acid { params: { note, bpm, bars, cutoff, reso, envMod, decay, accent, drive }, import? }." ] } })
  );
  return reg;
}
