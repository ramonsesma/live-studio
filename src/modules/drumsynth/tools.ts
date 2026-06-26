// Módulo: Drum Synth — synthesizes kick / snare / clap / hat sounds in-host (src/core/drumsynth.ts)
// and imports the result as a new clip. Heavy work runs in the Bridge (/api/drumsynth); the
// rendered WAV is served at /api/drumsynthaudio for in-panel audition.
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
  reg.register({ name:"how_drum_synth_works", description:"How Drum Synth makes kicks, snares, claps and hats", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Pick a drum type and dial the parameters; the sound is synthesized in-host (no samples needed).",
      "Kick: a pitch-enveloped sine + sub + click + drive. Snare: tonal body + band-passed noise (snappy).",
      "Clap: several short noise bursts + a tail. Hat: high-passed noise + a metallic ring, closed or open.",
      "Audition plays the rendered WAV in the panel; 'Synthesize & import' drops it onto your track as a new clip.",
      "Programmatic entry: POST /api/drumsynth { type: 'kick'|'snare'|'clap'|'hat', params, import? }." ] } })
  );
  return reg;
}
