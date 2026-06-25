// Módulo: Audio → MIDI Melody — renders a track/clip's audio in-host, runs a YIN pitch
// tracker (src/core/pitch.ts), segments the result into notes and writes them into a new
// MIDI clip. Monophonic (single voice). Heavy work in the Bridge (/api/audio2midi).
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
  reg.register({ name:"how_audio_to_midi_works", description:"How Audio → MIDI Melody transcribes a monophonic part into a MIDI clip", category:"midi", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Pick an audio track with a MONOPHONIC part (vocal, bass, lead — one note at a time) and press Transcribe.",
      "The track's pre-FX audio is rendered in-host and run through a YIN pitch tracker; frames are smoothed and segmented into notes.",
      "Times are converted to beats with the current song tempo, then written into a NEW MIDI track so your audio stays untouched.",
      "Tune the noise floor / min note length if it picks up breaths or splits sustained notes; polyphonic material is not supported.",
      "Programmatic entry: POST /api/audio2midi { trackIndex, startBeat?, endBeat?, noiseFloor?, minDurMs?, write? }." ] } })
  );
  return reg;
}
