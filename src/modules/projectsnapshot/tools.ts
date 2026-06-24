// Módulo: Project Snapshot — "git for Live Sets". Serializes the whole Set to JSON on disk
// (environment.storageDirectory), diffs two snapshots and restores one. The heavy work runs
// in the Bridge (/api/snapshot, needs environment + async param reads); this documents it.
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

  reg.register({ name:"how_snapshots_work", description:"How Project Snapshot versions a Live Set (save / diff / restore)", category:"versioning", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Open the Project Snapshot panel and press Snapshot now — it serializes tracks, mixer levels, clips/notes, scenes, tempo and scale to JSON in environment.storageDirectory/.snapshots.",
      "Pick two snapshots to see a GitHub-style diff (what changed: tempo, names, mute/solo, volumes, note counts, added/removed tracks).",
      "Restore writes the state back (names, mute/solo, mixer levels, tempo, MIDI clip notes, scene names) in one step — existing structure only.",
      "Programmatic entry: POST /api/snapshot { action: 'save'|'list'|'diff'|'restore'|'delete', ... }." ] } })
  );

  return reg;
}
