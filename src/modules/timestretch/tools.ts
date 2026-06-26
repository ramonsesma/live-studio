// Módulo: Time-Stretch — stretches a clip's audio in-host with a JS WSOLA overlap-add engine
// (pitch-preserving) or varispeed (tape-style), then imports the result as a NEW clip. Heavy
// work runs in the Bridge (/api/timestretch); see src/core/stretch.ts for the DSP.
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
  reg.register({ name:"how_time_stretch_works", description:"How Time-Stretch processes a clip's audio", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Pick an audio clip and a ratio (0.25–4×). ratio > 1 makes it longer/slower; < 1 shorter/faster.",
      "OLA mode preserves pitch (WSOLA overlap-add); grain size trades smoothness vs transient sharpness.",
      "Varispeed mode resamples — pitch and length change together, like a tape/varispeed.",
      "The clip's source file is read (or the track is rendered), processed in-host, and imported as a NEW clip — your original is untouched.",
      "Programmatic entry: POST /api/timestretch { trackIndex, clipIndex?, ratio, mode: 'ola'|'varispeed', grain?, import? }." ] } })
  );
  return reg;
}
