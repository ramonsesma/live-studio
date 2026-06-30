// Módulo: Pad Engine — synthesizes evolving pads/drones in-host (src/core/pad.ts): a detuned-saw
// chord through a moving low-pass filter with chorus and long envelopes, imported as a new clip.
// Heavy work in the Bridge (/api/pad); the WAV is served at /api/audioout for in-panel audition.
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
  reg.register({ name:"how_pad_works", description:"How the Pad Engine synthesizes evolving pads", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Pick a root note and a chord; a bank of detuned saws per note makes the lush 'supersaw' body.",
      "A slow LFO moves the low-pass cutoff for the evolving, breathing texture; voices/detune set the width.",
      "Long attack and release make it swell in and out; chorus widens it further.",
      "Audition the pad in the panel, then import it as a sustained clip.",
      "Programmatic entry: POST /api/pad { params: { note, chord, voices, detune, cutoff, lfoRate, lfoDepth, attack, release, length }, import? }." ] } })
  );
  return reg;
}
