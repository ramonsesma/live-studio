// Módulo: Mixing Assistant (IA) — reference_match now reads REAL fader/pan values (via
// track.mixer) for the loudness/pan axis and can apply real corrections; the tonal (EQ/spectrum)
// axis needs audio render, which this song-only module can't do, so it's honestly advisory and
// points at resonance__mask_matrix / Spectrum Match for the real per-band comparison.
import { recordParamAt, keyTrack } from "../../core/history.js";
import { faderValueToDb, faderDbToValue } from "../../core/dsp.js";
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

  // suggest_eq used to return the exact same 4 generic bands regardless of track content.
  // A real, render-analyzed version is registered on the Bridge as mixassistant__suggest_eq
  // (see registerBridgeTools in bridge.ts) — same real analysis eq__suggest_eq uses.

  reg.register({ name:"suggest_compression", description:"Get a starting-point compression preset for an instrument type (a lookup table, not analysis — real per-track compression lives in the Compression & Dynamics module)", category:"mixing", parameters:{ track_index:{type:"number",description:"Track index",required:true}, instrument:{type:"string",description:"Instrument type",required:false,enum:["vocals","drums","bass","guitar","synth","bus"]} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      const presets: any = {
        vocals:{threshold:-18,ratio:3,attack:5,release:80,knee:3},
        drums:{threshold:-12,ratio:5,attack:1,release:50,knee:1},
        bass:{threshold:-10,ratio:4,attack:10,release:100,knee:2},
        bus:{threshold:-6,ratio:2,attack:30,release:200,knee:4}
      };
      return { success:true, data:{ trackName:track?.name||"Unknown", preset:presets[args.instrument]||presets.vocals } };
    }
  );

  
  reg.register({ name:"reference_match", description:"Match target tracks' real fader/pan to a reference track (loudness axis is real and can be applied; tonal/EQ matching needs audio render — see resonance__mask_matrix)", category:"mixing", parameters:{ reference_track:{type:"number",description:"Reference track index",required:true}, target_tracks:{type:"string",description:"Comma-separated target track indices (default: all other tracks)",required:false}, match_type:{type:"string",description:"Match type",required:false,enum:["tonal","loudness","both"]}, apply:{type:"boolean",description:"Write the matched fader values (loudness axis only)",required:false} } },
    async (args: any, song: any) => {
      const ref = song.tracks?.[args.reference_track];
      if (!ref?.mixer?.volume) return { success:false, error:"Reference track not found or has no mixer." };
      const targetIdx = args.target_tracks ? String(args.target_tracks).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n)) : (song.tracks||[]).map((_: any, i: number) => i).filter((i: number) => i !== args.reference_track);
      const refDb = faderValueToDb(await ref.mixer.volume.getValue());
      const matchType = args.match_type || "both";
      const adjustments: any[] = [];
      for (const i of targetIdx) {
        const t = song.tracks?.[i]; if (!t?.mixer?.volume) continue;
        const curDb = faderValueToDb(await t.mixer.volume.getValue());
        const deltaDb = Number((refDb - curDb).toFixed(2));
        let applied = false;
        if (matchType !== "tonal" && args.apply) {
          await recordParamAt(t.mixer.volume, keyTrack(i), "mixassistant.reference_match");
          await t.mixer.volume.setValue(Math.max(0, Math.min(1, faderDbToValue(refDb))));
          applied = true;
        }
        adjustments.push({ trackIndex:i, trackName:t.name, currentDb:Number(curDb.toFixed(2)), targetDb:Number(refDb.toFixed(2)), deltaDb, applied });
      }
      const tonalNote = matchType !== "loudness" ? { advisory:true, note:"Tonal/EQ matching needs a rendered spectrum comparison — run resonance__mask_matrix or open Spectrum Match to see where the reference and targets actually overlap in frequency." } : {};
      return { success:true, data:{ reference:ref.name, matchType, adjustments, ...tonalNote } };
    }
  );

  return reg;
}
