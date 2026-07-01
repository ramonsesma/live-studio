// Módulo: Clip Version History — persisted version history per clip (src/core/storage.ts),
// with real note/duration capture, a restore that actually writes the notes back, and a real
// diff. auto_snapshot is marked advisory: the extension has no background scheduler to trigger
// a periodic capture — it only runs when a tool is called.
import { saveJson, loadJson } from "../../core/storage.js";
import { recordNotes } from "../../core/history.js";
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

const SUB = "clip_versions";
const fileId = (ti: number, ci: number) => `${ti}_${ci}`;
function getClip(song: any, ti: number, ci: number) { const t = song?.tracks?.[ti]; return t?.clipSlots?.[ci ?? 0]?.clip ?? t?.arrangementClips?.[ci ?? 0]; }

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"save_version", description:"Save the clip's REAL current notes/duration as a version", category:"versioning", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, label:{type:"string",description:"Version label",required:false}, description:{type:"string",description:"Change description",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index); if (!clip || !Array.isArray(clip.notes)) return { success:false, error:"No MIDI clip here." };
      const id = fileId(args.track_index, args.clip_index);
      const file = loadJson(SUB, id) || { trackIndex: args.track_index, clipIndex: args.clip_index, versions: [] };
      const notes = clip.notes.map((n: any) => ({ ...n }));
      const duration = notes.length ? Math.max(1, ...notes.map((n: any) => n.startTime + (n.duration || 0))) : (clip.duration || 4);
      const ver = { id: file.versions.length + 1, label: args.label || `v${file.versions.length + 1}`, description: args.description || "", timestamp: new Date().toISOString(), notes, noteCount: notes.length, length: Number(duration.toFixed(3)) };
      file.versions.push(ver); saveJson(SUB, id, file);
      return { success:true, data:{ version:{ id:ver.id, label:ver.label, description:ver.description, timestamp:ver.timestamp, noteCount:ver.noteCount, length:ver.length }, totalVersions:file.versions.length } };
    }
  );

  reg.register({ name:"list_versions", description:"List all saved versions for a clip", category:"versioning", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (args: any) => {
      const file = loadJson(SUB, fileId(args.track_index, args.clip_index));
      const versions = (file?.versions || []).map((v: any) => ({ id:v.id, label:v.label, description:v.description, timestamp:v.timestamp, noteCount:v.noteCount, length:v.length }));
      return { success:true, data:{ versions, count:versions.length } };
    }
  );

  reg.register({ name:"restore_version", description:"Restore a saved version's notes onto the clip for real (undoable)", category:"versioning", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, version_id:{type:"number",description:"Version ID to restore",required:true} } },
    async (args: any, song: any) => {
      const file = loadJson(SUB, fileId(args.track_index, args.clip_index));
      const ver = file?.versions.find((v: any) => v.id === args.version_id);
      if (!ver) return { success:false, error:`Version ${args.version_id} not found` };
      const clip = getClip(song, args.track_index, args.clip_index); if (!clip) return { success:false, error:"Clip not found" };
      recordNotes(clip, args.track_index, args.clip_index, "clipversions.restore_version");
      clip.notes = ver.notes.map((n: any) => ({ ...n }));
      return { success:true, data:{ restored:true, label:ver.label, noteCount:ver.noteCount } };
    }
  );

  reg.register({ name:"diff_versions", description:"Diff two saved clip versions (real note-level comparison)", category:"versioning", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, version_a:{type:"number",description:"Version A",required:true}, version_b:{type:"number",description:"Version B",required:true} } },
    async (args: any) => {
      const file = loadJson(SUB, fileId(args.track_index, args.clip_index));
      const a = file?.versions.find((v: any) => v.id === args.version_a), b = file?.versions.find((v: any) => v.id === args.version_b);
      if (!a || !b) return { success:false, error:"One or both versions not found." };
      const key = (n: any) => `${n.pitch}@${n.startTime.toFixed(3)}`;
      const setA = new Set(a.notes.map(key)), setB = new Set(b.notes.map(key));
      const added = [...setB].filter((k) => !setA.has(k)).length, removed = [...setA].filter((k) => !setB.has(k)).length;
      const common = [...setA].filter((k) => setB.has(k)).length;
      return { success:true, data:{ diff:{ notesAdded:added, notesRemoved:removed, notesUnchanged:common, noteCountA:a.noteCount, noteCountB:b.noteCount, lengthDiff:Number((b.length - a.length).toFixed(3)) }, versionA:args.version_a, versionB:args.version_b } };
    }
  );

  reg.register({ name:"auto_snapshot", description:"Preference for auto-versioning (advisory — the extension has no background scheduler to run this periodically; call save_version yourself on the cadence you want)", category:"versioning", parameters:{ enabled:{type:"boolean",description:"Enable auto-snapshot",required:false}, interval_seconds:{type:"number",description:"Min interval",required:false} } },
    async (args: any) => ({ success:true, data:{ advisory:true, note:"No background scheduler exists in this extension — nothing will fire on its own. Call clipversions__save_version yourself (e.g. from a script or before risky edits).", autoSnapshot:args.enabled !== false, interval:args.interval_seconds||30 } })
  );

  return reg;
}
