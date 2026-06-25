// Módulo: Loop Length Detective — estimates a loop's BPM from its audio and suggests a global
// song.tempo (the honest version of the impossible "tempo map"). Heavy work in the Bridge.
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
  reg.register({ name:"how_loop_detect_works", description:"How the Loop Length Detective estimates BPM and suggests a global tempo", category:"tempo", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Right-click / select an audio clip and open the Loop Detect panel — it decodes the clip (or renders it) and estimates the tempo from onset autocorrelation.",
      "It also offers bar-fit candidates: assuming the loop is a whole number of 4/4 bars, BPM = bars*4 / seconds * 60.",
      "There is no tempo automation in the SDK, so this suggests a single global song.tempo you can apply — it doesn't try to write a tempo map.",
      "Programmatic entry: POST /api/loopdetect { trackIndex, clipIndex?, applyTempo? } (or { demo:true })." ] } })
  );
  return reg;
}
