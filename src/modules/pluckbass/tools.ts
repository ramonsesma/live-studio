// Módulo: Pluck Bass — synthesizes a short Karplus-Strong pluck at bass register + sub layer + drive (finger pluck / bass guitar) in-host, imported as a new clip.
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
  reg.register({ name:"how_it_works", description:"How the Pluck Bass engine works", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Pluck Bass synthesizes a short Karplus-Strong pluck at bass register + sub layer + drive (finger pluck / bass guitar).",
      "Audition the sound in the panel, then import it as a new clip — your project is untouched.",
      "Programmatic entry: POST /api/pluckbass { params: { note, length, damping, brightness, sub, drive }, import? }." ] } })
  );
  return reg;
}
