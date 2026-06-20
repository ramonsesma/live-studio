// Módulo: Mixing Assistant (IA) — reutilizado de examples/ai-mixing-assistant
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

  reg.register({ name:"analyze_mix", description:"Analyze full mix and return issues", category:"mixing", parameters:{ reference_track:{type:"number",description:"Reference track index",required:false}, target_lufs:{type:"number",description:"Target LUFS",required:false} } },
    async (args: any) => {
      const issues = [
        { type:"frequency_masking", severity:"high", tracks:[0,1], freqRange:"200-500Hz", suggestion:"Cut 3dB at 300Hz on track 1" },
        { type:"dynamic_range", severity:"medium", track:2, dr:4, suggestion:"Reduce compression on track 2" },
        { type:"stereo_balance", severity:"low", track:3, imbalance:"L +2.3dB", suggestion:"Pan slightly right" }
      ];
      return { success:true, data:{ analyzed:true, issues, score:78, targetLUFS:args.target_lufs||-14 } };
    }
  );

  reg.register({ name:"suggest_eq", description:"Get EQ suggestions for a track", category:"mixing", parameters:{ track_index:{type:"number",description:"Track index",required:true}, style:{type:"string",description:"Mix style",required:false,enum:["clean","warm","bright","vintage"]} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      const suggestions = [
        { freq:80, type:"highpass", gain:-6, q:0.7, reason:"Remove sub rumble" },
        { freq:300, type:"bell", gain:-3, q:1.2, reason:"Reduce boxiness" },
        { freq:3000, type:"bell", gain:2, q:1.5, reason:"Add presence" },
        { freq:10000, type:"highshelf", gain:1.5, q:0.7, reason:"Add air" }
      ];
      return { success:true, data:{ trackName:track?.name||"Unknown", suggestions, style:args.style||"clean" } };
    }
  );

  reg.register({ name:"suggest_compression", description:"Get compression suggestions", category:"mixing", parameters:{ track_index:{type:"number",description:"Track index",required:true}, instrument:{type:"string",description:"Instrument type",required:false,enum:["vocals","drums","bass","guitar","synth","bus"]} } },
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

  reg.register({ name:"loudness_target", description:"Set loudness target and auto-adjust", category:"mixing", parameters:{ target_lufs:{type:"number",description:"Target LUFS",required:true}, track_indices:{type:"string",description:"Tracks to adjust",required:false} } },
    async (args: any) => {
      const tracks = args.track_indices ? String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n)) : [0,1,2,3];
      return { success:true, data:{ targetLUFS:args.target_lufs, tracksAdjusted:tracks.length, gainApplied:tracks.map(()=>(Math.random()-0.5)*6) } };
    }
  );

  reg.register({ name:"reference_match", description:"Match mix to reference track", category:"mixing", parameters:{ reference_track:{type:"number",description:"Reference track index",required:true}, target_tracks:{type:"string",description:"Tracks to match",required:false}, match_type:{type:"string",description:"Match type",required:false,enum:["tonal","loudness","both"]} } },
    async (args: any, song: any) => {
      const ref = song.tracks[args.reference_track];
      const targets = args.target_tracks ? String(args.target_tracks).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n)) : [0,1,2];
      return { success:true, data:{ reference:ref?.name||"Unknown", targets, matchType:args.match_type||"both", adjustments:targets.map(()=>({ eq:{}, compression:{} })) } };
    }
  );

  return reg;
}
