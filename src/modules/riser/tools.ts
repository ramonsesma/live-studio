// Módulo: Riser — synthesizes risers / sweeps / downlifters in-host (noise + oscillator source,
// pitch sweep, moving filter, fades, movement, drive, modulated-delay FX) and imports the result
// as a new clip. Heavy work in the Bridge (/api/riser); DSP in src/core/riser.ts.
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
  reg.register({ name:"how_riser_works", description:"How Riser builds sweeps and transitions", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Choose a source (noise / oscillator / mix), a length, and a pitch sweep (start → end note).",
      "A moving SVF filter (up or down) plus volume fade and movement modulation shape the build or fall.",
      "Add drive and an optional phaser/flanger/chorus FX; risers (fade up) or downlifters (fade down) both work.",
      "Audition the rendered sweep in the panel, then import it as a new clip aligned to your transition.",
      "Programmatic entry: POST /api/riser { params: { source, noise, wave, startNote, endNote, filter, filterDir, volume, movement, drive, fx, length }, import? }." ] } })
  );
  return reg;
}
