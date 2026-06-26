// Módulo: Slice Lab — slices a clip's audio and reorders/processes each step with pattern lanes
// (reverse, stutter, pitch, tape-stop, SVF filter, bitcrush, flanger, gated reverb), then imports
// the result as a new loop. Heavy work in the Bridge (/api/slicelab); DSP in src/core/slicefx.ts.
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
  reg.register({ name:"how_slice_lab_works", description:"How Slice Lab mutates an audio clip into a new loop", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Open an audio clip, choose how many slices, then reorder them and add per-slice FX with the pattern lanes.",
      "Lanes: slice order, reverse, stutter, pitch, tape-stop, filter (LP/BP/HP/Notch + sweep), bitcrush, flanger, gated reverb.",
      "Randomize/Reset per lane or all; preview source vs result waveforms and audition before exporting.",
      "The result is rendered in-host and imported as a NEW loop — your original clip is untouched.",
      "Programmatic entry: POST /api/slicelab { trackIndex, clipIndex?, slices, lanes:{ order, reverse[], pitch[]… }, filter, crossfade, import? }." ] } })
  );
  return reg;
}
