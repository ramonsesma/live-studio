// Módulo: Macro Snapshot Morph — captures a device's parameter values to disk and morphs
// (lerps) between two snapshots via DeviceParameter.setValue. Live has no preset morphing.
// Heavy work runs in the Bridge (/api/macromorph, needs storageDirectory + async param IO).
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

  reg.register({ name:"how_morph_works", description:"How Macro Snapshot Morph captures and morphs device parameter states", category:"macros", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Open the Macro Morph panel, point it at a track + device (a rack's macros, or any device's parameters), and press Capture to save the current state to storageDirectory/.macro-snapshots.",
      "Capture two states you like (A and B), then drag the Morph slider — it linearly interpolates every parameter between A and B and writes the values with DeviceParameter.setValue.",
      "Quantized parameters snap (no half-steps); continuous ones slide. You discover the in-between settings neither preset had.",
      "Programmatic entry: POST /api/macromorph { action: 'read'|'capture'|'list'|'get'|'morph'|'apply'|'delete', trackIndex, deviceIndex, ... }." ] } })
  );

  return reg;
}
