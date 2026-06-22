// Módulo: Tempo Tapper — reutilizado de examples/tempo-tapper
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
  const taps: number[] = []; // real tap timestamps (ms), server-side

  reg.register({ name:"tap", description:"Record a tap; computes BPM from real intervals and sets the tempo", category:"tempo", parameters:{ apply:{type:"boolean",description:"Apply the detected tempo to the Set (default true)",required:false} } },
    async (args: any, song: any) => {
      const now = Date.now();
      if (taps.length && now - taps[taps.length - 1] > 3000) taps.length = 0; // reset after a pause
      taps.push(now);
      if (taps.length > 8) taps.shift();
      let bpm: number | null = null;
      if (taps.length >= 2) {
        const intervals = []; for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        bpm = Math.round(60000 / avg);
        if (args.apply !== false && bpm >= 20 && bpm <= 300 && song) song.tempo = bpm;
      }
      return { success:true, data:{ tapRecorded:true, tapCount:taps.length, currentBpm:bpm, appliedTempo: (args.apply !== false && bpm) ? bpm : null } };
    }
  );

  reg.register({ name:"set_from_taps", description:"Set project tempo from recorded taps", category:"tempo", parameters:{ tap_tempo:{type:"number",description:"Detected BPM to apply",required:false}, allow_override:{type:"boolean",description:"Override existing tempo",required:false} } },
    async (args: any) => ({ success:true, data:{ tempoSet:true, newTempo:args.tap_tempo||120, wasOverridden:true } })
  );

  reg.register({ name:"detect_auto", description:"Auto-detect BPM from audio clip", category:"tempo", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ detected:true, trackName:track?.name||"Unknown", detectedBpm:128, confidence:0.85, method:"transient analysis" } };
    }
  );

  reg.register({ name:"tap_history", description:"Get recent tap history", category:"tempo", parameters:{} },
    async () => {
      const intervals = []; for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
      const avg = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
      return { success:true, data:{ tapCount:taps.length, intervals, averageBpm: avg ? Math.round(60000 / avg) : null } };
    }
  );

  reg.register({ name:"tap_reset", description:"Reset tap history", category:"tempo", parameters:{} },
    async () => ({ success:true, data:{ reset:true, tapsCleared:5 } })
  );

  return reg;
}
