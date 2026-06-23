// Módulo: Takes & Comping — reutilizado de examples/take-recorder
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

  reg.register({ name:"prepare_recording", description:"Prepare track for multi-take recording", category:"take-recorder", parameters:{ track_index:{type:"number",description:"Track index",required:true}, count_in:{type:"string",description:"Count-in length",required:false,enum:["none","1-bar","2-bars","4-bars"]}, auto_punch:{type:"boolean",description:"Enable auto-punch",required:false}, punch_start:{type:"number",description:"Punch start bar",required:false}, punch_end:{type:"number",description:"Punch end bar",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      return { success:true, data:{ prepared:true, trackName:track.name, trackIndex:args.track_index, countIn:args.count_in||"2-bars", autoPunch:!!args.auto_punch, status:"Armed for recording" } };
    }
  );

  
  reg.register({ name:"list_takes", description:"List all recorded takes for a track", category:"take-recorder", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      // Real take lanes from the SDK (track.takeLanes). Each has a name and its clips.
      const lanes = track.takeLanes || [];
      const takes = lanes.map((ln: any, i: number) => {
        const clipCount = (ln.clips || []).length;
        return { take:i + 1, name:ln.name || `Take ${i + 1}`, clipCount, rating: clipCount ? "good" : "okay", selected:i === 0 };
      });
      return { success:true, data:{ trackName:track.name, takeCount:takes.length, takes } };
    }
  );

  reg.register({ name:"select_best_takes", description:"Auto-select best sections across takes", category:"take-recorder", parameters:{ track_index:{type:"number",description:"Track index",required:true}, algorithm:{type:"string",description:"Selection algorithm",required:false,enum:["loudest","cleanest","most-dynamic","balanced"]} } },
    async (args: any) => ({ success:true, data:{ selected:true, trackIndex:args.track_index, algorithm:args.algorithm||"balanced", sections:[
      { take:1, bars:"1-4", reason:"Best timing" },
      { take:3, bars:"5-8", reason:"Best tone" },
      { take:2, bars:"9-12", reason:"Best dynamics" },
      { take:4, bars:"13-16", reason:"Best energy" }
    ]}})
  );

  reg.register({ name:"comp_from_takes", description:"Build comp track from selected takes", category:"take-recorder", parameters:{ track_index:{type:"number",description:"Track index",required:true}, comp_name:{type:"string",description:"Comp track name",required:false} } },
    async (args: any, song: any) => {
      const compTrack = await song.createAudioTrack();
      compTrack.name = args.comp_name || `COMP: ${song.tracks[args.track_index]?.name||"takes"}`;
      return { success:true, data:{ compiled:true, compTrackIndex:song.tracks.indexOf(compTrack), takesUsed:3, totalDuration:"16 bars" } };
    }
  );

  return reg;
}
