// Módulo: 808 Engine — synthesizes a tuned 808 / sub-bass in-host (src/core/sub808.ts): a sine
// with a fast pitch glide, long decay and saturation, imported as a new clip. Heavy work in the
// Bridge (/api/sub808); the rendered WAV is served at /api/audioout for in-panel audition.
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
  reg.register({ name:"how_808_works", description:"How the 808 Engine synthesizes a tuned sub", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Pick a note (the 808's fundamental) and a decay; longer decay = the classic boom/sustain.",
      "Glide sets how far the pitch lifts at the attack and snaps down — more glide = more punch.",
      "Drive adds tanh saturation (the harmonics that let an 808 cut through small speakers); click adds a transient.",
      "Audition plays the rendered sub in the panel; Synthesize & import drops it onto your track as a new clip.",
      "Programmatic entry: POST /api/sub808 { params: { note, glide, glideTime, decay, drive, click, length }, import? }." ] } })
  );
  return reg;
}
