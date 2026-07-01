// Módulo: Instrument Render — renders any MIDI clip through any in-host synth engine
// (Sub808, Sub Bass, Pad, Pluck, Bell, Stab, Organ, Vocal Chop, Drum Synth) into a new audio
// clip. This is what wires our engines to every MIDI-producing module: chords / harmonizer /
// bassengine / genrhythm / drums / stepseq / patternlang / arp / clip variations…
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
  reg.register({ name:"how_it_works", description:"How Instrument Render plays a MIDI clip through an engine", category:"audio", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Pick a MIDI clip (chords, melody, bassline, drums, arp, pattern, variations…) and an engine; each note is synthesized at its pitch + duration and mixed into one audio clip.",
      "Engines: sub808, subbass, pad, pluck, bell, stab, organ, vocalchop, drumsynth. Each one accepts its own params via the panel.",
      "The render uses song.tempo for beats↔seconds; notes overlap correctly (polyphonic).",
      "The result is imported as a new audio clip — your original MIDI clip stays intact.",
      "Programmatic entry: POST /api/render { trackIndex, clipIndex?, engine, params, import? }." ] } })
  );
  return reg;
}
