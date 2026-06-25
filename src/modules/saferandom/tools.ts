// Módulo: Safe Randomizer — nudges a device's parameters within a bounded fraction of their
// range (so it explores without breaking the sound), skipping locked params. Locks and the
// pre-randomize state persist to storageDirectory. Heavy work in the Bridge (/api/saferandom).
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
  reg.register({ name:"how_safe_random_works", description:"How the Safe Randomizer explores device parameters without breaking the sound", category:"macros", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Open the Safe Randomizer on a track + device, set the Amount (how far each param can move, as a % of its range) and press Randomize.",
      "Each parameter is nudged within ±Amount of its CURRENT value (not the full range), so you explore variations instead of chaos.",
      "Click a knob's lock to keep a parameter fixed — locks persist per device in storageDirectory. Reset restores the values from before the last randomize.",
      "Pairs with Macro Snapshot Morph and Project Snapshot for a full preset-exploration toolkit.",
      "Programmatic entry: POST /api/saferandom { action: 'read'|'randomize'|'reset'|'lock'|'unlock', trackIndex, deviceIndex, amount?, paramName? }." ] } })
  );
  return reg;
}
