// Módulo: Stem Aligner — finds the time offset between a guide and a target audio track by
// cross-correlating their energy envelopes (render→envelope in host). The heavy work runs in
// the Bridge (/api/stemalign); these tools document it for the copilot.
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

  reg.register({ name:"how_alignment_works", description:"How the Stem Aligner finds and applies the offset between two audio tracks", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Open the Stem Aligner panel, pick a guide track and a target track, then press Detect.",
      "Both are rendered and reduced to energy envelopes; a normalized cross-correlation finds the lag where they line up — that's the offset (ms + beats) with a confidence.",
      "Apply shifts the target's arrangement clip by that offset (offset only — the SDK can't write warp markers, so internal timing isn't time-stretched).",
      "Programmatic entry: POST /api/stemalign { guideIndex, targetIndex, apply? } (or { demo:true })." ] } })
  );

  return reg;
}
