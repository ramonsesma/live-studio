// Módulo: Linked Clips — master/slave clip groups persisted to storage. sync_group really
// copies the source clip's notes onto every linked MIDI clip (undoable per clip). Audio
// members can't receive content via the SDK — reported honestly per member.
import { recordNotes } from "../../core/history.js";
import { saveJson, loadJson, listJson, deleteJson } from "../../core/storage.js";

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

const SUB = "linkedclips";

function parseRef(ref: string): { t: number; c: number } | null {
  const m = /^t(\d+)_c(\d+)$/.exec(String(ref).trim());
  return m ? { t: +m[1], c: +m[2] } : null;
}
function getClip(song: any, t: number, c: number) {
  return song?.tracks?.[t]?.clipSlots?.[c]?.clip ?? null;
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"link_clips", description:"Create a persistent link group of Session clips (refs like \"t0_c1,t2_c0\") — sync_group then propagates one member's notes to the rest", category:"linked-clips", parameters:{ clips:{type:"string",description:"Comma-separated clip refs, e.g. t0_c1,t2_c0 (min 2)",required:true}, name:{type:"string",description:"Group name",required:false} } },
    async (args: any, song: any) => {
      const refs = String(args.clips || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      const parsed = refs.map(parseRef);
      if (refs.length < 2 || parsed.some((p) => !p)) return { success:false, error:"Give at least two refs shaped t<track>_c<slot>, e.g. t0_c1,t2_c0" };
      const missing = refs.filter((r, i) => !getClip(song, parsed[i]!.t, parsed[i]!.c));
      if (missing.length) return { success:false, error:`No clip at: ${missing.join(", ")}` };
      const id = `link_${Date.now()}`;
      const group = { id, name: args.name || `Group ${listJson(SUB).length + 1}`, members: refs, createdAt: new Date().toISOString() };
      saveJson(SUB, id, group);
      return { success:true, data:{ linked:true, groupId:id, name:group.name, members:refs } };
    }
  );

  reg.register({ name:"sync_group", description:"Propagate the source member's REAL notes to every other MIDI clip in a link group (undoable per clip); audio members are reported as not-syncable", category:"linked-clips", parameters:{ group_id:{type:"string",description:"Group id from link_clips",required:true}, source:{type:"string",description:"Source ref, e.g. t0_c1 (default: first member)",required:false} } },
    async (args: any, song: any) => {
      const group = loadJson(SUB, args.group_id);
      if (!group) return { success:false, error:"Group not found — see list_groups." };
      const srcRef = args.source || group.members[0];
      const sp = parseRef(srcRef);
      if (!sp || !group.members.includes(srcRef)) return { success:false, error:`source must be one of the group's members: ${group.members.join(", ")}` };
      const srcClip = getClip(song, sp.t, sp.c);
      if (!srcClip || !Array.isArray(srcClip.notes)) return { success:false, error:"Source clip is missing or not MIDI." };
      const srcNotes = srcClip.notes.map((n: any) => ({ ...n }));
      const results: any[] = [];
      for (const ref of group.members) {
        if (ref === srcRef) continue;
        const p = parseRef(ref)!;
        const clip = getClip(song, p.t, p.c);
        if (!clip) { results.push({ ref, synced:false, reason:"clip missing" }); continue; }
        if (!Array.isArray(clip.notes)) { results.push({ ref, synced:false, reason:"audio clip — the SDK can't write audio content" }); continue; }
        recordNotes(clip, p.t, p.c, "linkedclips.sync_group");
        clip.notes = srcNotes.map((n: any) => ({ ...n }));
        results.push({ ref, synced:true, notes:srcNotes.length });
      }
      return { success:true, data:{ groupId:group.id, source:srcRef, sourceNotes:srcNotes.length, results, syncedCount:results.filter((r) => r.synced).length } };
    }
  );

  reg.register({ name:"list_groups", description:"List saved clip link groups", category:"linked-clips", parameters:{} },
    async () => ({ success:true, data:{ groups: listJson(SUB).map((g: any) => ({ id:g.id, name:g.name, members:g.members, createdAt:g.createdAt })) } })
  );

  reg.register({ name:"unlink_group", description:"Delete a clip link group (clips themselves are untouched)", category:"linked-clips", parameters:{ group_id:{type:"string",description:"Group id",required:true} } },
    async (args: any) => deleteJson(SUB, args.group_id)
      ? { success:true, data:{ unlinked:true, groupId:args.group_id } }
      : { success:false, error:"Group not found." }
  );

  return reg;
}
