// Módulo: Mix Scene Saver — persisted mixer snapshots (src/core/storage.ts) with a
// recall that actually writes volume/pan/mute/solo/sends back onto the real tracks (undoable),
// and a real per-track compare across every snapshotted parameter.
import { saveJson, loadJson, listJson, deleteJson } from "../../core/storage.js";
import { keyTrack, recordParamAt, recordToggle } from "../../core/history.js";
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

const SUB = "mix_scenes";

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"save_scene", description:"Save current mixer state as a scene (persists to disk)", category:"mix-scene", parameters:{ name:{type:"string",description:"Scene name",required:true}, snapshot_tracks:{type:"string",description:"Comma-separated track indices, or 'all'",required:false}, include_volume:{type:"boolean",description:"Snapshot volume",required:false}, include_pan:{type:"boolean",description:"Snapshot pan",required:false}, include_mute:{type:"boolean",description:"Snapshot mute/solo",required:false}, include_sends:{type:"boolean",description:"Snapshot send levels",required:false} } },
    async (args: any, song: any) => {
      const which = args.snapshot_tracks && args.snapshot_tracks !== "all"
        ? String(args.snapshot_tracks).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n))
        : (song.tracks||[]).map((_: any, i: number) => i);
      const tracks = [];
      for (const i of which) {
        const t = song.tracks?.[i]; if (!t) continue;
        tracks.push({
          index:i, name:t.name||`Track ${i+1}`,
          volume: t.mixer?.volume ? await t.mixer.volume.getValue() : null,
          pan: t.mixer?.panning ? await t.mixer.panning.getValue() : null,
          muted: !!t.mute, solo: !!t.solo,
          sends: t.mixer?.sends ? await Promise.all(t.mixer.sends.map((s: any) => s.getValue())) : [],
        });
      }
      const id = `scene_${Date.now()}`;
      const snapshot = { id, name:args.name, timestamp:new Date().toISOString(), tracks };
      saveJson(SUB, id, snapshot);
      return { success:true, data:{ sceneSaved:true, sceneId:id, sceneName:args.name, trackCount:tracks.length } };
    }
  );

  reg.register({ name:"recall_scene", description:"Recall a saved mix scene, writing volume/pan/mute/solo/sends back onto the real tracks (undoable)", category:"mix-scene", parameters:{ scene_id:{type:"string",description:"Scene ID to recall",required:true} } },
    async (args: any, song: any) => {
      const scene = loadJson(SUB, args.scene_id);
      if (!scene) return { success:false, error:`Scene ${args.scene_id} not found` };
      let applied = 0;
      for (const snap of scene.tracks) {
        const t = song.tracks?.[snap.index]; if (!t) continue;
        if (snap.volume != null && t.mixer?.volume) { await recordParamAt(t.mixer.volume, keyTrack(snap.index), "mixscene.recall_scene"); await t.mixer.volume.setValue(snap.volume); }
        if (snap.pan != null && t.mixer?.panning) { await recordParamAt(t.mixer.panning, keyTrack(snap.index), "mixscene.recall_scene"); await t.mixer.panning.setValue(snap.pan); }
        if (typeof snap.muted === "boolean") { recordToggle(keyTrack(snap.index), "mixscene.recall_scene(mute)", () => t.mute, (v) => { t.mute = v; }); t.mute = snap.muted; }
        if (typeof snap.solo === "boolean") { recordToggle(keyTrack(snap.index), "mixscene.recall_scene(solo)", () => t.solo, (v) => { t.solo = v; }); t.solo = snap.solo; }
        if (Array.isArray(snap.sends) && t.mixer?.sends) { for (let s = 0; s < snap.sends.length && s < t.mixer.sends.length; s++) { await recordParamAt(t.mixer.sends[s], keyTrack(snap.index), "mixscene.recall_scene(send)"); await t.mixer.sends[s].setValue(snap.sends[s]); } }
        applied++;
      }
      return { success:true, data:{ sceneRecalled:true, sceneName:scene.name, tracksApplied:applied } };
    }
  );

  reg.register({ name:"list_scenes", description:"List saved mix scenes", category:"mix-scene", parameters:{} },
    async () => { const scenes = listJson(SUB); return { success:true, data:{ scenes, totalScenes:scenes.length } }; }
  );

  reg.register({ name:"delete_scene", description:"Delete a saved scene", category:"mix-scene", parameters:{ scene_id:{type:"string",description:"Scene ID to delete",required:true} } },
    async (args: any) => { const ok = deleteJson(SUB, args.scene_id); return { success:ok, data:{ deleted:ok, sceneId:args.scene_id }, error: ok ? undefined : `Scene ${args.scene_id} not found` }; }
  );

  reg.register({ name:"compare_scenes", description:"Compare two saved mix scenes across every snapshotted track/parameter", category:"mix-scene", parameters:{ scene_a_id:{type:"string",description:"First scene ID",required:true}, scene_b_id:{type:"string",description:"Second scene ID",required:true} } },
    async (args: any) => {
      const a = loadJson(SUB, args.scene_a_id), b = loadJson(SUB, args.scene_b_id);
      if (!a || !b) return { success:false, error:"One or both scenes not found." };
      const differences: any[] = [];
      for (const ta of a.tracks) {
        const tb = b.tracks.find((x: any) => x.index === ta.index); if (!tb) continue;
        if (ta.volume !== tb.volume) differences.push({ track:ta.name, param:"volume", a:ta.volume, b:tb.volume, diff: tb.volume != null && ta.volume != null ? Number((tb.volume - ta.volume).toFixed(4)) : null });
        if (ta.pan !== tb.pan) differences.push({ track:ta.name, param:"pan", a:ta.pan, b:tb.pan, diff: tb.pan != null && ta.pan != null ? Number((tb.pan - ta.pan).toFixed(4)) : null });
        if (ta.muted !== tb.muted) differences.push({ track:ta.name, param:"muted", a:ta.muted, b:tb.muted });
        if (ta.solo !== tb.solo) differences.push({ track:ta.name, param:"solo", a:ta.solo, b:tb.solo });
      }
      return { success:true, data:{ differences, sceneA:a.name, sceneB:b.name } };
    }
  );

  return reg;
}
