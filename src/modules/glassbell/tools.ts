// Módulo: Glass Bell — synthesizes a crystalline glass bell (additive inharmonic partials, brighter and colder than FM Bell) in-host, imported as a new clip.
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
  reg.register({ name:"how_it_works", description:"How the Glass Bell engine works", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Glass Bell synthesizes a crystalline glass bell (additive inharmonic partials, brighter and colder than FM Bell).",
      "Audition the sound in the panel, then import it as a new clip — your project is untouched.",
      "Programmatic entry: POST /api/glassbell { params: { note, decay, shimmer, length }, import? }." ] } })
  );
  return reg;
}
