// Módulo: Vocal Chain & FX — setup_chain already inserted real devices; the remaining tools now
// find those real devices on the track and write actual parameter values (keyword-matched, same
// pattern as the compressor module), instead of only echoing the requested numbers back.
import { recordParamAt, keyTrack } from "../../core/history.js";
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

function findDevice(track: any, pattern: RegExp) { return (track?.devices || []).find((d: any) => pattern.test(d?.name || "")); }
async function setByKeyword(dev: any, trackIndex: number, map: Record<string, number>, label: string) {
  let setN = 0; const applied: any = {};
  for (const [kw, val] of Object.entries(map)) {
    if (val == null) continue;
    const p = (dev.parameters || []).find((pp: any) => String(pp.name).toLowerCase().includes(kw));
    if (!p) continue;
    await recordParamAt(p, keyTrack(trackIndex), label);
    await p.setValue(Math.max(p.min, Math.min(p.max, val)));
    applied[p.name] = val; setN++;
  }
  return { setN, applied };
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"setup_chain", description:"Set up full vocal processing chain on a track", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, chain_type:{type:"string",description:"Vocal chain preset",required:false,enum:["lead","backing","rap","podcast","vocal_fx","harmony"]}, add_compressor:{type:"boolean",description:"Add compressor",required:false}, add_eq:{type:"boolean",description:"Add EQ",required:false}, add_deesser:{type:"boolean",description:"Add de-esser",required:false}, add_reverb:{type:"boolean",description:"Add reverb send",required:false}, add_delay:{type:"boolean",description:"Add delay send",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const chain: string[] = [];
      if (args.add_eq !== false) chain.push("EQ Eight");
      if (args.add_deesser !== false) chain.push("Multiband Dynamics");
      if (args.add_compressor !== false) chain.push("Compressor");
      if (args.add_reverb !== false) chain.push("Reverb");
      if (args.add_delay !== false) chain.push("Delay");
      if (typeof track.insertDevice !== "function") return { success:false, error:"Open a track in Live to insert the vocal chain." };
      let idx = (track.devices || []).length; const inserted: string[] = [];
      for (const name of chain) { try { await track.insertDevice(name, idx++); inserted.push(name); } catch { /* device name not available — skip */ } }
      if (!inserted.length) return { success:false, error:"Could not insert any chain device." };
      return { success:true, data:{ applied:true, trackName:track.name, chainType:args.chain_type||"lead", devicesAdded:inserted, deviceCount:inserted.length } };
    }
  );

  reg.register({ name:"set_deesser", description:"Set de-esser parameters on the track's Multiband Dynamics device (undoable) — requires setup_chain to have added one first", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, frequency:{type:"number",description:"De-ess frequency Hz (2000-10000)",required:false}, amount:{type:"number",description:"Reduction amount 0-100%",required:false}, mode:{type:"string",description:"Processing mode",required:false,enum:["broadband","split"]} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index]; if (!track) return { success:false, error:"Track not found" };
      const dev = findDevice(track, /multiband\s*dynamics/i);
      if (!dev) return { success:false, error:"No Multiband Dynamics device on this track — run vocal__setup_chain first." };
      const { setN, applied } = await setByKeyword(dev, args.track_index, { freq:args.frequency, thresh:args.amount != null ? 100 - args.amount : null }, "vocal.set_deesser");
      return { success:true, data:{ deesserSet:setN > 0, device:dev.name, paramsSet:setN, applied, trackName:track.name } };
    }
  );

  reg.register({ name:"set_vocal_eq", description:"Set bands on the track's EQ Eight device (undoable) — requires setup_chain to have added one first", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, hp_filter:{type:"number",description:"High-pass filter Hz",required:false}, low_mid:{type:"number",description:"Low-mid cut/boost dB",required:false}, presence:{type:"number",description:"Presence boost dB",required:false}, air:{type:"number",description:"Air band boost dB",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index]; if (!track) return { success:false, error:"Track not found" };
      const dev = findDevice(track, /eq\s*eight/i);
      if (!dev) return { success:false, error:"No EQ Eight device on this track — run vocal__setup_chain first." };
      const map: Record<string, number | null> = {};
      if (args.hp_filter != null) map["1 frequency"] = args.hp_filter;
      if (args.low_mid != null) map["2 gain"] = args.low_mid;
      if (args.presence != null) map["4 gain"] = args.presence;
      if (args.air != null) map["5 gain"] = args.air;
      const { setN, applied } = await setByKeyword(dev, args.track_index, map, "vocal.set_vocal_eq");
      return { success:true, data:{ eqSet:setN > 0, device:dev.name, paramsSet:setN, applied, trackName:track.name } };
    }
  );

  reg.register({ name:"set_vocal_comp", description:"Set the track's Compressor device (undoable) — requires setup_chain to have added one first", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, threshold:{type:"number",description:"Threshold dB (-40 to 0)",required:false}, ratio:{type:"number",description:"Ratio 1-20",required:false}, attack:{type:"number",description:"Attack ms (0.01-30)",required:false}, release:{type:"number",description:"Release ms (5-500)",required:false}, makeup:{type:"number",description:"Makeup gain dB",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index]; if (!track) return { success:false, error:"Track not found" };
      const dev = findDevice(track, /^compressor$/i);
      if (!dev) return { success:false, error:"No Compressor device on this track — run vocal__setup_chain first." };
      const { setN, applied } = await setByKeyword(dev, args.track_index, { threshold:args.threshold, ratio:args.ratio, attack:args.attack, release:args.release, makeup:args.makeup ?? null, output:args.makeup }, "vocal.set_vocal_comp");
      return { success:true, data:{ compSet:setN > 0, device:dev.name, paramsSet:setN, applied, trackName:track.name } };
    }
  );

  reg.register({ name:"add_vocal_fx", description:"Insert a real creative-FX device on the vocal track where a native Live device exists; otherwise advisory", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, fx_type:{type:"string",description:"FX type",required:true,enum:["reverb","delay","chorus","doubler","harmonizer","pitch","formant","vocoder","saturation","distortion","tremolo","auto_pan"]}, wet_dry:{type:"number",description:"Wet/dry mix 0-100% (advisory — not all devices expose this by that name)",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index]; if (!track) return { success:false, error:"Track not found" };
      const NATIVE: Record<string, string> = { reverb:"Reverb", delay:"Delay", chorus:"Chorus-Ensemble", saturation:"Saturator", distortion:"Overdrive", auto_pan:"Auto Pan", vocoder:"Vocoder", tremolo:"Auto Pan" };
      const deviceName = NATIVE[args.fx_type];
      if (!deviceName) return { success:true, data:{ advisory:true, note:`"${args.fx_type}" has no native Live device the SDK can insert (only built-in devices are supported) — add a suitable Max for Live device by hand, then control it via the Device Remote module.`, fxType:args.fx_type } };
      if (typeof track.insertDevice !== "function") return { success:false, error:"Open a track in Live to insert devices." };
      try {
        const dev = await track.insertDevice(deviceName, (track.devices || []).length);
        return { success:true, data:{ fxAdded:true, trackName:track.name, fxType:args.fx_type, device:dev.name } };
      } catch { return { success:false, error:`Could not insert "${deviceName}".` }; }
    }
  );

  return reg;
}
