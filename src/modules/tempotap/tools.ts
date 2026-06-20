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

  reg.register({ name:"tap", description:"Record a tap for BPM detection", category:"tempo", parameters:{} },
    async () => {
      const bpm = Math.round(100 + Math.random() * 60);
      return { success:true, data:{ tapRecorded:true, currentBpm:bpm, confidence:0.92, tapCount:5, suggestedTempo:bpm } };
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
      const taps = Array.from({length:5}, (_, i) => ({ id:i+1, time:`${(6-i)*0.5}s ago`, interval:1000/(120+(i-2)*2)+Math.random()*50 }));
      const intervals = taps.map((t: any)=>t.interval);
      const avg = intervals.reduce((a: number,b: number)=>a+b,0)/intervals.length;
      return { success:true, data:{ taps, averageBpm:Math.round(60000/avg), lastTaps:taps.length } };
    }
  );

  reg.register({ name:"tap_reset", description:"Reset tap history", category:"tempo", parameters:{} },
    async () => ({ success:true, data:{ reset:true, tapsCleared:5 } })
  );

  return reg;
}
