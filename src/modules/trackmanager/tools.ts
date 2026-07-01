// Módulo: Bulk Track Manager — real bulk mute/solo/arm/volume/duplicate across tracks.
// track.mute/solo/arm ARE settable in the SDK; track.color and a "frozen" flag do NOT exist
// on Track (only Clip has .color) — color_tracks is honestly advisory, pointing at Color
// Theory Palette (which colors real clips) instead of pretending to color tracks.
import { keyTrack, recordParamAt, recordToggle } from "../../core/history.js";
import { faderDbToValue, faderValueToDb } from "../../core/dsp.js";
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

const parseIdx = (s: string) => String(s).split(",").map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n));

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"list_tracks", description:"List all tracks with their real state (name, mute/solo/arm, volume, kind)", category:"track-manager", parameters:{} },
    async (_a: any, song: any) => {
      const tracks = await Promise.all((song.tracks || []).slice(0, 40).map(async (t: any, i: number) => ({ index:i, name:t.name||`Track ${i+1}`, kind: "createAudioClip" in t ? "audio" : "midi", muted:!!t.mute, solo:!!t.solo, armed:!!t.arm, volumeDb: t.mixer?.volume ? Number(faderValueToDb(await t.mixer.volume.getValue()).toFixed(1)) : null })));
      return { success:true, data:{ total:song.tracks?.length||0, tracks } };
    }
  );

  reg.register({ name:"bulk_action", description:"Apply mute/solo/arm to multiple tracks at once (undoable)", category:"track-manager", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices",required:true}, action:{type:"string",description:"Action to apply",required:true,enum:["mute","unmute","toggle_mute","solo","unsolo","toggle_solo","arm","disarm","toggle_arm"]} } },
    async (args: any, song: any) => {
      const indices = parseIdx(args.track_indices);
      const prop = args.action.includes("mute") ? "mute" : args.action.includes("solo") ? "solo" : "arm";
      let applied = 0;
      for (const i of indices) {
        const t = song.tracks?.[i]; if (!t) continue;
        const before = !!t[prop];
        const after = args.action.startsWith("toggle_") ? !before : args.action.startsWith("un") || args.action === "disarm" ? false : true;
        recordToggle(keyTrack(i), `trackmanager.bulk_action(${prop})`, () => t[prop], (v) => { t[prop] = v; });
        t[prop] = after; applied++;
      }
      return { success:true, data:{ applied:true, action:args.action, trackCount:applied, trackIndices:indices } };
    }
  );

  reg.register({ name:"color_tracks", description:"Set color for multiple tracks (advisory — the SDK has no Track.color; only clips are colorable, see Color Theory Palette)", category:"track-manager", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices",required:true}, color:{type:"string",description:"Color hex code",required:true} } },
    async (args: any) => ({ success:true, data:{ advisory:true, note:"Track.color doesn't exist in the SDK — only clip.color is writable. Use the Color Theory Palette module to color a track's clips instead.", count: parseIdx(args.track_indices).length, color:args.color } })
  );

  reg.register({ name:"set_volume", description:"Set the fader (in dB) for multiple tracks at once (undoable)", category:"track-manager", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices",required:true}, volume:{type:"number",description:"Volume in dB (e.g. -6)",required:true}, relative:{type:"boolean",description:"Add to the current level instead of setting absolute",required:false} } },
    async (args: any, song: any) => {
      const indices = parseIdx(args.track_indices);
      let applied = 0;
      for (const i of indices) {
        const t = song.tracks?.[i]; if (!t?.mixer?.volume) continue;
        const curDb = faderValueToDb(await t.mixer.volume.getValue());
        const targetDb = args.relative ? curDb + args.volume : args.volume;
        await recordParamAt(t.mixer.volume, keyTrack(i), "trackmanager.set_volume");
        await t.mixer.volume.setValue(Math.max(0, Math.min(1, faderDbToValue(targetDb))));
        applied++;
      }
      return { success:true, data:{ volumeSet:true, count:applied, volume:args.volume, relative:!!args.relative } };
    }
  );

  reg.register({ name:"duplicate_tracks", description:"Duplicate tracks for real (song.duplicateTrack); optionally clears the clips on the copies", category:"track-manager", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices",required:true}, with_content:{type:"boolean",description:"Keep the duplicated clips (default true) — false clears them from the copy",required:false} } },
    async (args: any, song: any) => {
      if (typeof song.duplicateTrack !== "function") return { success:false, error:"duplicateTrack needs Live." };
      const indices = parseIdx(args.track_indices);
      const dups: any[] = [];
      for (const i of indices) {
        const t = song.tracks?.[i]; if (!t) continue;
        try {
          const copy = await song.duplicateTrack(t);
          if (args.with_content === false) { for (const slot of (copy.clipSlots || [])) { if (slot.clip) { try { await slot.deleteClip(); } catch {} } } }
          dups.push({ original:i, duplicateIndex: song.tracks.indexOf(copy), duplicateName: copy.name });
        } catch { /* skip tracks that can't be duplicated (e.g. Master) */ }
      }
      if (!dups.length) return { success:false, error:"Could not duplicate any of those tracks." };
      return { success:true, data:{ duplicated:true, count:dups.length, withContent: args.with_content !== false, duplicates:dups } };
    }
  );

  return reg;
}
