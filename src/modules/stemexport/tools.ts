// Módulo: Stem Export — batch-renders every audio track to a WAV on disk with automatic
// naming, formalizing the resources.renderPreFxAudio pipeline already used for analysis
// (resonance/autogain) into a real export feature. The actual render/write happens in the
// Bridge (needs resources/environment); this documents it and lists which tracks are eligible.
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

  reg.register({ name:"list_export_candidates", description:"List which tracks would actually export (audio tracks — MIDI tracks need resampling to audio first)", category:"stem-export", parameters:{} },
    async (_a: any, song: any) => {
      const tracks = song?.tracks || [];
      const rows = tracks.map((t: any, i: number) => ({ index:i, name:t.name||`Track ${i+1}`, kind: "createAudioClip" in t ? "audio" : "midi", exportable: "createAudioClip" in t }));
      return { success:true, data:{ total:rows.length, exportable:rows.filter((r: any) => r.exportable).length, tracks:rows } };
    }
  );

  reg.register({ name:"how_it_works", description:"How Stem Export renders and names files", category:"stem-export", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Open the Stem Export panel and press Export — it renders each audio track's pre-fx audio (resources.renderPreFxAudio) and writes a real WAV per track to disk.",
      "MIDI tracks are skipped (not faked) — resample them to audio in Live first, then they'll show up as exportable.",
      "File names follow a pattern with {index} and {name} placeholders, default \"{index}_{name}\" (e.g. 01_Kick.wav).",
      "Files land in a fresh timestamped folder under the extension's temp directory; the response returns the exact paths.",
      "Programmatic entry: POST /api/stemexport { trackIndices?, namePattern?, startBeat?, endBeat? } (or { demo:true })." ] } })
  );

  return reg;
}
