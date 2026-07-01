// Módulo: Project Health Analyzer — REAL checks over the live object model:
// missing samples (AudioClip.filePath + fs.existsSync), empty tracks/scenes, duplicate
// names, un-warped long audio, empty MIDI clips, MIDI tracks with notes but no instrument,
// and accidentally tiny clips. apply_fix performs real, undoable mutations.
import { existsSync } from "node:fs";

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

const PEN: any = { error: 12, warning: 6, info: 2 };
const isAudio = (c: any) => c && typeof c.filePath === "string";

function scan(song: any) {
  const tracks = song?.tracks || [];
  const scenes = song?.scenes || [];
  const issues: any[] = [];

  // per-track checks
  const nameCount: Record<string, number> = {};
  tracks.forEach((t: any, ti: number) => {
    nameCount[t.name || ""] = (nameCount[t.name || ""] || 0) + 1;
    const slots = t.clipSlots || [], arr = t.arrangementClips || [];
    const slotClips = slots.map((s: any) => s?.clip).filter(Boolean);
    if (slotClips.length + arr.length === 0) {
      issues.push({ type: "empty_track", severity: "warning", message: `Track "${t.name || ti}" has no clips`, fix: { kind: "delete_track", trackIndex: ti } });
    }
    let hasNotes = false;
    const checkAudio = (c: any, where: string, idx: number) => {
      if (!isAudio(c)) {
        if (c && Array.isArray(c.notes)) {
          if (c.notes.length === 0) issues.push({ type: "empty_midi_clip", severity: "info", message: `Empty MIDI clip "${c.name || idx}" on "${t.name || ti}"`, fix: null });
          else hasNotes = true;
          const span = c.notes.length ? Math.max(...c.notes.map((n: any) => n.startTime + (n.duration || 0))) : (c.duration || 0);
          if (span > 0 && span < 1) issues.push({ type: "very_short_clip", severity: "info", message: `Clip "${c.name || idx}" on "${t.name || ti}" is under 1 beat — likely accidental`, fix: null });
        }
        return;
      }
      if (!existsSync(c.filePath)) {
        issues.push({ type: "missing_sample", severity: "error", message: `Missing sample on "${t.name || ti}": ${String(c.filePath).split("/").pop()}`, fix: null });
      } else if (c.warping === false && (c.duration || 0) >= 8) {
        issues.push({ type: "unwarped_loop", severity: "warning", message: `Long un-warped audio on "${t.name || ti}"`, fix: { kind: "warp_clip", trackIndex: ti, clipIndex: idx, where } });
      }
    };
    slots.forEach((s: any, i: number) => checkAudio(s?.clip, "slot", i));
    arr.forEach((c: any, i: number) => checkAudio(c, "arr", i));
    if (hasNotes && (t.devices || []).length === 0) {
      issues.push({ type: "midi_no_instrument", severity: "warning", message: `"${t.name || ti}" has MIDI notes but no instrument device — it will play silently`, fix: null });
    }
  });

  // duplicate track names (rename all but the first)
  for (const [name, n] of Object.entries(nameCount)) {
    if (n > 1 && name) {
      const idxs = tracks.map((t: any, i: number) => (t.name === name ? i : -1)).filter((i: number) => i >= 0);
      idxs.slice(1).forEach((ti: number, k: number) => issues.push({ type: "duplicate_name", severity: "info", message: `Duplicate track name "${name}"`, fix: { kind: "rename_track", trackIndex: ti, newName: `${name} ${k + 2}` } }));
    }
  }

  // empty scenes (no track has a clip in that scene slot)
  scenes.forEach((sc: any, si: number) => {
    const hasClip = tracks.some((t: any) => t.clipSlots?.[si]?.clip);
    if (!hasClip) issues.push({ type: "empty_scene", severity: "info", message: `Scene "${sc.name || si}" is empty`, fix: { kind: "delete_scene", sceneIndex: si } });
  });

  const counts = { error: 0, warning: 0, info: 0 };
  let penalty = 0;
  for (const is of issues) { counts[is.severity as keyof typeof counts]++; penalty += PEN[is.severity] || 0; }
  const score = Math.max(0, Math.min(100, 100 - penalty));
  return { issues, counts, score, scanned: { tracks: tracks.length, scenes: scenes.length } };
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"run_checks", description:"Scan the project for real issues: missing samples, empty tracks/scenes, duplicate names, un-warped long audio", category:"health", parameters:{} },
    async (_a: any, song: any) => {
      const r = scan(song);
      return { success:true, data:{ score:r.score, counts:r.counts, scanned:r.scanned, issues:r.issues.slice(0, 200) } };
    }
  );

  reg.register({ name:"apply_fix", description:"Apply a fix returned by run_checks (rename/delete empty/warp)", category:"health", parameters:{ kind:{type:"string",description:"Fix kind",required:true,enum:["rename_track","delete_track","delete_scene","warp_clip"]}, track_index:{type:"number",description:"Track index",required:false}, scene_index:{type:"number",description:"Scene index",required:false}, clip_index:{type:"number",description:"Clip index",required:false}, where:{type:"string",description:"slot|arr",required:false}, new_name:{type:"string",description:"New track name",required:false} } },
    async (args: any, song: any) => {
      const tracks = song?.tracks || [];
      try {
        if (args.kind === "rename_track") { const t = tracks[args.track_index]; if (!t) return { success:false, error:"Track not found" }; t.name = args.new_name; return { success:true, data:{ fixed:true, kind:args.kind } }; }
        if (args.kind === "delete_track") { const t = tracks[args.track_index]; if (!t || !song.deleteTrack) return { success:false, error:"Cannot delete track" }; await song.deleteTrack(t); return { success:true, data:{ fixed:true, kind:args.kind } }; }
        if (args.kind === "delete_scene") { const sc = song.scenes?.[args.scene_index]; if (!sc || !song.deleteScene) return { success:false, error:"Cannot delete scene" }; await song.deleteScene(sc); return { success:true, data:{ fixed:true, kind:args.kind } }; }
        if (args.kind === "warp_clip") { const t = tracks[args.track_index]; const c = args.where === "arr" ? t?.arrangementClips?.[args.clip_index] : t?.clipSlots?.[args.clip_index]?.clip; if (!c) return { success:false, error:"Clip not found" }; c.warping = true; return { success:true, data:{ fixed:true, kind:args.kind } }; }
        return { success:false, error:`Unknown fix kind: ${args.kind}` };
      } catch (err: any) { return { success:false, error: err.message || String(err) }; }
    }
  );

  reg.register({ name:"get_report", description:"One-shot health summary (score + issue counts)", category:"health", parameters:{} },
    async (_a: any, song: any) => {
      const r = scan(song);
      return { success:true, data:{ score:r.score, counts:r.counts, total:r.issues.length, scanned:r.scanned } };
    }
  );

  return reg;
}
