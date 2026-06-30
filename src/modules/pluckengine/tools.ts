// Módulo: Pluck Engine — synthesizes plucked strings/harp in-host (src/core/pluck.ts) via
// Karplus-Strong, strumming a chord, imported as a new clip. Heavy work in the Bridge
// (/api/pluck); the WAV is served at /api/audioout for in-panel audition.
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
  reg.register({ name:"how_pluck_works", description:"How the Pluck Engine synthesizes plucked strings", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Karplus-Strong: a short noise burst is fed into a delay line tuned to the note, with a low-pass feedback that decays into a string tone.",
      "Damping sets how fast it dies (short pluck vs long sustain); brightness sets the tone (mellow nylon vs bright steel).",
      "Pick a chord and a strum time to arpeggiate the notes like a harp/guitar strum.",
      "Audition in the panel, then import the pluck as a new clip.",
      "Programmatic entry: POST /api/pluck { params: { note, chord, damping, brightness, strum, length }, import? }." ] } })
  );
  return reg;
}
