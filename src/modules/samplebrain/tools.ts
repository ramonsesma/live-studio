// Módulo: Sample Library Brain — indexes audio samples to a local JSON index with a
// perceptual fingerprint (our own FFT, no sqlite/native deps), then searches by text/BPM/key
// or "similar samples" (cosine distance) and drops one into the project. Heavy work in Bridge.
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

  reg.register({ name:"how_sample_brain_works", description:"How the Sample Library Brain indexes and searches your samples", category:"library", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Open the Sample Brain panel and press Index — it scans the audio clips in your project (and an optional folder of WAVs), computes a spectral fingerprint + rough BPM/key/brightness, and writes a JSON index to storageDirectory/.sample-brain.",
      "Search by text/tags, BPM range or key; or click a sample and 'Find similar' to rank by timbre (cosine distance of the fingerprints).",
      "Drop into project imports the file (importIntoProject) and places it on a new audio track.",
      "No native dependencies: the index is plain JSON and the fingerprint comes from the in-house FFT.",
      "Programmatic entry: POST /api/samplebrain { action: 'index'|'search'|'drop', ... }." ] } })
  );

  return reg;
}
