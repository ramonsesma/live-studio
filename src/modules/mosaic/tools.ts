// Módulo: Mosaic — generative loops from a clip's audio: slice it, shuffle the order from a seed
// and apply chance-based per-slice FX, producing N reproducible variations. Heavy work in the
// Bridge (/api/mosaic); shares the slice/FX engine with Slice Lab (src/core/slicefx.ts).
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
  reg.register({ name:"how_mosaic_works", description:"How Mosaic generates loop variations from a clip", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Pick an audio clip, a slice count and how many variations; Mosaic shuffles the slices and rolls chance-based FX per slice.",
      "Each variation comes from a seed, so the same seed + settings always reproduce the same loop.",
      "Set the probability (0–100%) for reverse, stutter, pitch, tape-stop, filter, flanger, bitcrush and gated reverb.",
      "Crossfade smooths slice joins; every variation is rendered in-host and imported as a new clip.",
      "Programmatic entry: POST /api/mosaic { trackIndex, clipIndex?, slices, variations, seed, chances:{reverse,…}, crossfade, import? }." ] } })
  );
  return reg;
}
