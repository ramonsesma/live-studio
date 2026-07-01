// Módulo: Choir — synthesizes a synthetic choir pad (detuned saws through vocal formant filters, slow attack, chorus) in-host, imported as a new clip.
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
  reg.register({ name:"how_it_works", description:"How the Choir engine works", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Choir synthesizes a synthetic choir pad (detuned saws through vocal formant filters, slow attack, chorus).",
      "Audition the sound in the panel, then import it as a new clip — your project is untouched.",
      "Programmatic entry: POST /api/choir { params: { note, chord, vowel, voices, detune, vibrato, attack, release, length }, import? }." ] } })
  );
  return reg;
}
