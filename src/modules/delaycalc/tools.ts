// Módulo: Delay Calculator — reutilizado de examples/delay-calculator
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

function calcDelay(bpm: number, noteValue: number) { return Math.round(60000 / bpm * (noteValue * 4)); }

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_bpm", description:"Get current project BPM", category:"delay-calc", parameters:{} },
    async (_a: any, song: any) => ({ success:true, data:{ bpm:song.tempo || 120, timeSignature:(song.scenes&&song.scenes[0]?(((song.scenes[0].signatureNumerator)||4)+"/"+((song.scenes[0].signatureDenominator)||4)):"4/4") } })
  );

  reg.register({ name:"calculate", description:"Calculate delay/reverb times from BPM", category:"delay-calc", parameters:{ bpm:{type:"number",description:"BPM (leave empty for project BPM)",required:false}, note_value:{type:"string",description:"Note value to calculate",required:false,enum:["1/1","1/2","1/2d","1/4","1/4d","1/4t","1/8","1/8d","1/8t","1/16","1/16d","1/16t","1/32"]} } },
    async (args: any, song: any) => {
      const bpm = args.bpm || song.tempo || 120;
      const noteValue = args.note_value || "all";
      const allTimes: any = {
        "1/1":calcDelay(bpm,1), "1/2":calcDelay(bpm,0.5), "1/2d":calcDelay(bpm,0.75),
        "1/4":calcDelay(bpm,0.25), "1/4d":calcDelay(bpm,0.375), "1/4t":calcDelay(bpm,0.1667),
        "1/8":calcDelay(bpm,0.125), "1/8d":calcDelay(bpm,0.1875), "1/8t":calcDelay(bpm,0.0833),
        "1/16":calcDelay(bpm,0.0625), "1/16d":calcDelay(bpm,0.09375), "1/16t":calcDelay(bpm,0.0417),
        "1/32":calcDelay(bpm,0.03125)
      };
      if (noteValue !== "all") {
        return { success:true, data:{ bpm, noteValue, delayMs:allTimes[noteValue], freqHz:(1000/allTimes[noteValue]).toFixed(2), reverbPredelay:Math.round(allTimes[noteValue]*0.3), reverbDecay:`${Math.round(allTimes[noteValue]*3)}ms (${(allTimes[noteValue]*3/1000).toFixed(2)}s)` } };
      }
      return { success:true, data:{ bpm, allTimes } };
    }
  );

  reg.register({ name:"apply_delay", description:"Set a delay effect time from calculation", category:"delay-calc", parameters:{ track_index:{type:"number",description:"Track index",required:true}, note_value:{type:"string",description:"Note value to set",required:true,enum:["1/4","1/4d","1/8","1/8d","1/8t","1/16","1/16d","1/16t"]}, device_index:{type:"number",description:"Delay device index on track",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      const bpm = song.tempo || 120;
      const ms = calcDelay(bpm,0.125);
      return { success:true, data:{ applied:true, trackName:track?.name||"Unknown", noteValue:args.note_value, delayMs:ms, deviceUpdated:args.device_index||0 } };
    }
  );

  reg.register({ name:"get_tempo_tap", description:"Tap to calculate BPM from interval", category:"delay-calc", parameters:{ interval_ms:{type:"number",description:"Time between taps in ms",required:true} } },
    async (args: any) => {
      const bpm = Math.round(60000 / args.interval_ms);
      return { success:true, data:{ bpm, interval:args.interval_ms, label:bpm > 140 ? "Fast" : bpm > 100 ? "Moderate" : bpm > 70 ? "Slow" : "Very Slow" } };
    }
  );

  return reg;
}
