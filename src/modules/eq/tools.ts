// Módulo: EQ & Análisis — apply_eq_preset now actually writes gain bands on the inserted EQ Eight
// (undoable) instead of only inserting the device and echoing numbers back.
import { recordParamAt, keyTrack } from "../../core/history.js";
export class ToolRegistry {
  private handlers = new Map();
  definitions: any[] = [];
  register(def: any, handler: any) { this.definitions.push(def); this.handlers.set(def.name, handler); }
  async execute(name: string, args: any, song: any) {
    const handler = this.handlers.get(name);
    if (!handler) return { success: false, error: `Unknown: ${name}` };
    try { return await handler(args, song); }
    catch (err: any) { return { success: false, error: err.message || String(err) }; }
  }
  getDefinitionsJson() { return this.definitions; }
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  
  reg.register({ name:"apply_eq_preset", description:"Apply EQ preset to a track", category:"eq", parameters:{ track_index:{type:"number",description:"Track",required:true}, preset:{type:"string",description:"Preset",required:true,enum:["clean","warm","bright","bass_cut","treble_boost","smile"]}, create_eq:{type:"boolean",description:"Create EQ device",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:`Track ${args.track_index} not found` };
      const presets: any = {
        clean: { low:0, lowMid:0, mid:0, highMid:0, high:0 },
        warm: { low:3, lowMid:2, mid:1, highMid:-1, high:-2 },
        bright: { low:-1, lowMid:0, mid:2, highMid:3, high:4 },
        bass_cut: { low:-6, lowMid:-3, mid:0, highMid:1, high:2 },
        treble_boost: { low:0, lowMid:1, mid:2, highMid:4, high:5 },
        smile: { low:3, lowMid:1, mid:-2, highMid:1, high:3 }
      };
      const preset = presets[args.preset];
      if (!preset) return { success:false, error:`Unknown preset: ${args.preset}` };
      let dev = (track.devices || []).find((d: any) => /eq\s*eight/i.test(d?.name || ""));
      if (!dev && args.create_eq !== false && typeof track.insertDevice === "function") {
        try { dev = await track.insertDevice("EQ Eight", track.devices?.length ?? 0); } catch { /* insertion failed — fall through to advisory */ }
      }
      if (!dev) return { success:true, data:{ advisory:true, note:"No EQ Eight device on this track and none could be inserted — open a track in Live first.", preset:args.preset, values:preset } };
      // Map the 5 named bands to EQ Eight's band 1-5 Gain parameters (bands 6-8 unused here).
      const bandGain = ["1 Gain", "2 Gain", "3 Gain", "4 Gain", "5 Gain"];
      const order = ["low", "lowMid", "mid", "highMid", "high"] as const;
      let setN = 0; const applied: any = {};
      for (let i = 0; i < order.length; i++) {
        const p = (dev.parameters || []).find((pp: any) => pp.name === bandGain[i] || pp.name.toLowerCase().includes(bandGain[i].toLowerCase()));
        if (!p) continue;
        await recordParamAt(p, keyTrack(args.track_index), "eq.apply_eq_preset");
        await p.setValue(Math.max(p.min, Math.min(p.max, preset[order[i]])));
        applied[order[i]] = preset[order[i]]; setN++;
      }
      return { success:true, data:{ applied: setN > 0, preset:args.preset, values:preset, paramsSet:setN, appliedBands:applied, device:dev.name, trackIndex:args.track_index } };
    }
  );

  reg.register({ name:"suggest_eq", description:"Get suggested EQ settings for a track", category:"analysis", parameters:{ track_index:{type:"number",description:"Track",required:true}, target_genre:{type:"string",description:"Target genre",required:false} } },
    async (args: any) => {
      const suggestions: any[] = [
        { band:"low", freq:100, gain:2, q:0.7, reason:"Add warmth to bass" },
        { band:"low_mid", freq:300, gain:-1.5, q:1.2, reason:"Remove boxiness" },
        { band:"high_mid", freq:3000, gain:2, q:0.8, reason:"Add clarity" },
        { band:"high", freq:10000, gain:1, q:0.5, reason:"Add air" }
      ];
      if (args.target_genre === "rock") suggestions.push({ band:"mid", freq:2000, gain:3, q:1, reason:"Rock guitar presence" });
      if (args.target_genre === "electronic") suggestions.push({ band:"sub", freq:60, gain:4, q:0.5, reason:"Electronic sub bass" });
      return { success:true, data:{ trackIndex:args.track_index, suggestions } };
    }
  );

  reg.register({ name:"get_sidechain_suggestions", description:"Get side-chain compression suggestions", category:"analysis", parameters:{ trigger_track:{type:"number",description:"Trigger track",required:true}, target_track:{type:"number",description:"Target track",required:true} } },
    async (args: any) => ({ success:true, data:{ suggestions:[{ type:"sidechain", trigger:args.trigger_track, target:args.target_track, ratio:4, attack:1, release:50, threshold:-20 }] } })
  );

  return reg;
}
