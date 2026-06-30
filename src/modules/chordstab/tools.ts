// Módulo: Chord Stab — synthesizes short, punchy synth chord stabs (saw stack through a fast filter envelope) in-host, imported as a new clip.
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
  reg.register({ name:"how_it_works", description:"How the Chord Stab engine works", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Chord Stab synthesizes short, punchy synth chord stabs (saw stack through a fast filter envelope).",
      "Audition the sound in the panel, then import it as a new clip — your project is untouched.",
      "Programmatic entry: POST /api/stab { params: { note, chord, decay, cutoff, reso, envMod, drive, length }, import? }." ] } })
  );
  return reg;
}
