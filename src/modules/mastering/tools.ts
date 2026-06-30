// Módulo: Gain Staging & Niveles — reutilizado de examples/gain-staging
import { recordParamAt, keyTrack } from "../../core/history.js";
import { faderDbToValue } from "../../core/dsp.js";
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

  reg.register({ name:"analyze_gain_structure", description:"Analyze gain staging across all tracks and devices", category:"gain-staging", parameters:{} },
    async (_a: any, song: any) => {
      const tracks = song.tracks || [];
      const stages = [];
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        const fader = t.mixer?.volume ? await t.mixer.volume.getValue() : null;
        const pan = t.mixer?.panning ? await t.mixer.panning.getValue() : null;
        stages.push({ trackIndex:i, trackName:t.name||`Track ${i+1}`, fader, pan, deviceCount:(t.devices||[]).length, muted:!!t.mute });
      }
      return { success:true, data:{ totalTracks:tracks.length, analyzedTracks:stages.length, stages } };
    }
  );

  reg.register({ name:"set_target_level", description:"Set a track's fader to a target level in dB", category:"gain-staging", parameters:{ track_index:{type:"number",description:"Track index",required:true}, target_db:{type:"number",description:"Target level dB (e.g. -12)",required:true} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t?.mixer?.volume) return { success:false, error:"Track has no mixer (open in Live)." };
      const val = Math.max(0, Math.min(1, faderDbToValue(args.target_db)));
      await recordParamAt(t.mixer.volume, keyTrack(args.track_index), "mastering.set_target_level");
      await t.mixer.volume.setValue(val);
      return { success:true, data:{ set:true, trackIndex:args.track_index, targetDb:args.target_db, faderValue:Number(val.toFixed(3)) } };
    }
  );

  reg.register({ name:"auto_gain_stage", description:"Set a track's fader to leave a target headroom below 0 dBFS", category:"gain-staging", parameters:{ track_index:{type:"number",description:"Track index",required:true}, target_headroom:{type:"number",description:"Target headroom dB",required:false,enum:["3","6","9","12"]} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t?.mixer?.volume) return { success:false, error:"Track has no mixer (open in Live)." };
      const headroom = Number(args.target_headroom || 6);
      const before = await t.mixer.volume.getValue();
      const val = Math.max(0, Math.min(1, faderDbToValue(-headroom)));
      await recordParamAt(t.mixer.volume, keyTrack(args.track_index), "mastering.auto_gain_stage");
      await t.mixer.volume.setValue(val);
      return { success:true, data:{ applied:true, trackIndex:args.track_index, targetHeadroom:headroom, faderBefore:Number(before.toFixed(3)), faderAfter:Number(val.toFixed(3)) } };
    }
  );

  reg.register({ name:"match_levels", description:"Match volume levels across selected tracks", category:"gain-staging", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices",required:true}, match_to:{type:"string",description:"Match strategy",required:false,enum:["loudest","quietest","average","first"]} } },
    async (args: any, song: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      const tracks = indices.map((i: number)=>song.tracks?.[i]).filter((t: any)=>t?.mixer?.volume);
      if (!tracks.length) return { success:false, error:"No valid tracks with a mixer" };
      const vols: number[] = await Promise.all(tracks.map((t: any)=>t.mixer.volume.getValue()));
      let target = vols.reduce((a,b)=>a+b,0)/vols.length;
      if (args.match_to === "loudest") target = Math.max(...vols);
      else if (args.match_to === "quietest") target = Math.min(...vols);
      else if (args.match_to === "first") target = vols[0];
      for (const t of tracks) { await recordParamAt(t.mixer.volume, keyTrack(song.tracks.indexOf(t)), "mastering.match_levels"); await t.mixer.volume.setValue(target); }
      return { success:true, data:{ matched:true, strategy:args.match_to||"average", tracksProcessed:tracks.length, targetFader:target } };
    }
  );

  return reg;
}
