// Módulo: Drum Bus Processor — set_bus_compressor now inserts/finds a real Compressor on each
// listed track and writes real parameters (keyword-matched, undoable). set_parallel_comp and
// analyze_drum_bus are honestly advisory: there's no send/routing API for parallel blend, and no
// way to pull an audio buffer from an existing track to run real spectral analysis on.
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

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"set_bus_compressor", description:"Insert/find a Compressor on each listed track and set its real parameters (undoable)", category:"drum-bus", parameters:{ track_indices:{type:"string",description:"Comma-separated drum track indices",required:true}, threshold:{type:"number",description:"Threshold dB (-60 to 0)",required:false}, ratio:{type:"number",description:"Compression ratio 1-20",required:false}, attack:{type:"number",description:"Attack ms (0.01-30)",required:false}, release:{type:"number",description:"Release ms (5-500)",required:false}, makeup:{type:"number",description:"Makeup gain dB (0-24)",required:false} } },
    async (args: any, song: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      const preset: any = { threshold:args.threshold??-18, ratio:args.ratio??4, attack:args.attack??1, release:args.release??100, makeup:args.makeup??3 };
      const map: any = { threshold:["threshold"], ratio:["ratio"], attack:["attack"], release:["release"], makeup:["makeup","output","gain"] };
      const results: any[] = [];
      for (const i of indices) {
        const track = song.tracks?.[i]; if (!track || typeof track.insertDevice !== "function") continue;
        let dev = (track.devices || []).find((d: any) => /^compressor$/i.test(d.name));
        if (!dev) { try { dev = await track.insertDevice("Compressor", (track.devices || []).length); } catch { continue; } }
        let setN = 0;
        for (const [k, val] of Object.entries(preset)) { const keys = (map as any)[k]; const p = (dev.parameters || []).find((pp: any) => keys.some((kw: string) => String(pp.name).toLowerCase().includes(kw))); if (p) { await recordParamAt(p, keyTrack(i), "drumbus.set_bus_compressor"); await p.setValue(Math.max(p.min, Math.min(p.max, val as number))); setN++; } }
        results.push({ trackIndex:i, trackName:track.name, paramsSet:setN });
      }
      if (!results.length) return { success:false, error:"Could not set up a Compressor on any of those tracks." };
      return { success:true, data:{ busCompressorSet:true, trackCount:results.length, ...preset, tracks:results } };
    }
  );

  reg.register({ name:"add_drum_group", description:"Create a bus track as a stand-in for a drum group (advisory — the SDK has no createGroupTrack/groupTrack setter, so members aren't actually parented under it)", category:"drum-bus", parameters:{ name:{type:"string",description:"Bus group name",required:false}, tracks:{type:"string",description:"Comma-separated track indices to group",required:true} } },
    async (args: any, song: any) => {
      const indices = String(args.tracks).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      const group = await song.createAudioTrack();
      group.name = args.name||"Drum Bus";
      return { success:true, data:{ advisory:true, note:"Track.groupTrack has no setter in the SDK — this is a plain bus track, not a real Group Track. Route the drum tracks' outputs to it manually, or group them in Live (Cmd/Ctrl+G).", groupCreated:true, groupName:group.name, requestedMemberCount:indices.length, groupIndex:song.tracks.indexOf(group) } };
    }
  );

  reg.register({ name:"set_parallel_comp", description:"Set parallel compression blend on drum bus (advisory — the SDK exposes no send/routing API to build a parallel-compression bus)", category:"drum-bus", parameters:{ blend:{type:"number",description:"Wet/dry blend 0-100%",required:true}, track_indices:{type:"string",description:"Comma-separated track indices",required:true} } },
    async (args: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      return { success:true, data:{ advisory:true, note:"Building a parallel-compression bus needs a send + return track wired up — the SDK has no API to create sends or route to a return. Set it up manually in Live, then use drumbus__set_bus_compressor on the return track.", blend:args.blend, trackCount:indices.length } };
    }
  );

  reg.register({ name:"analyze_drum_bus", description:"Analyze drum bus frequency and dynamics (advisory — the SDK can't read an audio buffer from an existing track, only from clips this extension renders itself)", category:"drum-bus", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices",required:true} } },
    async (args: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      return { success:true, data:{ advisory:true, note:"There's no API to pull an audio buffer from an existing track for FFT analysis — this extension can only analyze audio it renders itself. Bounce the bus to a sample and inspect it with a spectrum analyzer in Live.", trackIndices:indices } };
    }
  );

  return reg;
}
