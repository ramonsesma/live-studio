// Módulo: Audio Texture Mapper — turns an audio clip into MIDI by taking the dominant
// spectral peak(s) per time window (render→FFT in host) and mapping Hz→pitch. The heavy
// render runs in the Bridge (/api/texturemap); these tools expose the mapping to the copilot.
const NN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

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

  reg.register({ name:"hz_to_pitch", description:"Convert a frequency in Hz to the nearest MIDI pitch and note name", category:"audio2midi", parameters:{ hz:{type:"number",description:"Frequency in Hz",required:true} } },
    async (args: any) => {
      if (!(args.hz > 0)) return { success:false, error:"hz must be positive" };
      const pitch = Math.round(69 + 12 * Math.log2(args.hz / 440));
      return { success:true, data:{ hz:args.hz, pitch, name: NN[((pitch % 12) + 12) % 12] + (Math.floor(pitch / 12) - 1) } };
    }
  );

  reg.register({ name:"how_to_map", description:"How the Audio Texture Mapper turns audio into MIDI", category:"audio2midi", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Open the Texture Map panel and pick an audio track — it renders the region and FFT-analyzes it window by window.",
      "The strongest spectral peak(s) per window become MIDI notes (Hz→pitch); optionally snapped to Live's scale.",
      "Great for pulling a melody out of an ambient pad, a field recording or a vocal sample.",
      "Programmatic entry: POST /api/texturemap { trackIndex, noteCount?, polyphony?, snapScale? } (or { demo:true })." ] } })
  );

  return reg;
}
