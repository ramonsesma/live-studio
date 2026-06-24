// Módulo: Resonance — the set that listens to itself. Backs the Mix Radar panel, which
// drives the render→FFT "Listen" pipeline via the server's /api/listen route. These tools
// expose the analyzer to the copilot and let it reason about an already-rendered WAV.
import { analyzeWavFile } from "../../core/dsp.js";

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

  reg.register({ name:"analyze_wav", description:"Run FFT analysis on a rendered WAV file: 30 log bands, dominant frequency and loudness", category:"resonance", parameters:{ path:{type:"string",description:"Absolute path to a WAV file (e.g. from renderPreFxAudio)",required:true}, bands:{type:"number",description:"Number of log bands (default 30)",required:false} } },
    async (args: any) => {
      if (!args.path) return { success:false, error:"path is required" };
      const a = analyzeWavFile(String(args.path), { bands: args.bands || 30 });
      return { success:true, data:{ peakHz:a.peakHz, rmsDb:a.rmsDb, peakDb:a.peakDb, durationSec:a.durationSec, frames:a.frames, bands:a.bands } };
    }
  );

  reg.register({ name:"how_to_listen", description:"Explain how to run the Resonance Listen pipeline (render a stem then analyze)", category:"resonance", parameters:{} },
    async () => ({ success:true, data:{
      pipeline:["Open the Mix Radar panel and press Listen — it renders each audio track to a WAV and FFT-analyzes it in the host.",
        "Per-track spectra are combined into a frequency×track masking matrix; collisions become one-click corrective moves.",
        "The render half (resources.renderPreFxAudio) runs inside Live and targets audio tracks; resample a MIDI track to audio to listen to it.",
        "Programmatic entry: POST /api/listen { trackIndex } (or { wavPath } / { demo:true })."] } })
  );

  return reg;
}
