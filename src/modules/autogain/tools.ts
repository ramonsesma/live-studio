// Módulo: Auto-Gain Stager — measures real RMS/peak per audio track (render→FFT via the
// /api/autogain route, backed by the Bridge) and sets each fader to a reference level.
// These tools expose the gain-staging math to the copilot; the heavy render runs in the Bridge.
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

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"fader_for_target", description:"Compute the fader move (dB + 0-1 value) to bring a measured source level to a target", category:"gain-staging", parameters:{ source_rms_db:{type:"number",description:"Measured source RMS in dBFS",required:true}, target_db:{type:"number",description:"Target RMS in dBFS (e.g. -18)",required:false} } },
    async (args: any) => {
      const target = args.target_db ?? -18;
      const faderDb = Math.max(-24, Math.min(6, target - args.source_rms_db));
      return { success:true, data:{ sourceRmsDb:args.source_rms_db, targetDb:target, faderDb:Number(faderDb.toFixed(1)), faderValue:Number(faderDbToValue(faderDb).toFixed(4)), unityValue:0.85 } };
    }
  );

  reg.register({ name:"gain_reference_info", description:"How auto gain-staging works and the available reference levels", category:"gain-staging", parameters:{} },
    async () => ({ success:true, data:{
      references:["average (match all stems to their mean)", "-18 dBFS", "-12 dBFS", "loudest", "quietest"],
      howItWorks:["Open the Auto-Gain panel and press Analyze — it renders each audio track pre-fx and measures RMS/peak (exact).",
        "Pre-fx render is independent of the fader, so each fader is set to (target − source) dB.",
        "Apply writes track.mixer.volume via an estimated Live fader curve; the measurement is exact, the fader move is an estimate.",
        "Programmatic entry: POST /api/autogain { trackIndices?, targetMode?, apply? } (or { demo:true })."],
      faderCurve:{ unityDb0At:0.85, plus6dbAt:1.0, sampleMinus6Db:Number(faderDbToValue(-6).toFixed(3)), valueToDbAt0_5:Number(faderValueToDb(0.5).toFixed(1)) } } })
  );

  return reg;
}
