// Módulo: Takes & Comping — prepare_recording now really arms the track (track.arm); count-in/
// punch settings have no SDK equivalent (advisory). select_best_takes needs comparative audio
// analysis the SDK can't provide (advisory). comp_from_takes creates a real audio track but is
// honest that the SDK has no audio-splicing API to actually build the comp.
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

  reg.register({ name:"prepare_recording", description:"Arm the track for recording (real track.arm write); count-in/auto-punch are advisory — no SDK equivalent", category:"take-recorder", parameters:{ track_index:{type:"number",description:"Track index",required:true}, count_in:{type:"string",description:"Count-in length (advisory)",required:false,enum:["none","1-bar","2-bars","4-bars"]}, auto_punch:{type:"boolean",description:"Enable auto-punch (advisory)",required:false}, punch_start:{type:"number",description:"Punch start bar (advisory)",required:false}, punch_end:{type:"number",description:"Punch end bar (advisory)",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      track.arm = true;
      const extra = (args.count_in || args.auto_punch || args.punch_start != null) ? { advisory:true, note:"Count-in and punch-in/out aren't exposed by the SDK — set them in Live's Record preferences." } : {};
      return { success:true, data:{ prepared:true, trackName:track.name, trackIndex:args.track_index, armed:track.arm, status:"Armed for recording", ...extra } };
    }
  );

  reg.register({ name:"list_takes", description:"List all recorded takes for a track (real — reads Track.takeLanes)", category:"take-recorder", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const lanes = track.takeLanes || [];
      const takes = lanes.map((ln: any, i: number) => {
        const clipCount = (ln.clips || []).length;
        return { take:i + 1, name:ln.name || `Take ${i + 1}`, clipCount };
      });
      return { success:true, data:{ trackName:track.name, takeCount:takes.length, takes } };
    }
  );

  reg.register({ name:"select_best_takes", description:"Auto-select best sections across takes (advisory — the SDK has no audio-analysis API to compare take quality)", category:"take-recorder", parameters:{ track_index:{type:"number",description:"Track index",required:true}, algorithm:{type:"string",description:"Selection algorithm",required:false,enum:["loudest","cleanest","most-dynamic","balanced"]} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const takeCount = (track.takeLanes || []).length;
      return { success:true, data:{ advisory:true, note:"There's no API to analyze audio quality across takes — comp by ear in Live's Take Lanes view.", trackIndex:args.track_index, algorithm:args.algorithm||"balanced", takeCount } };
    }
  );

  reg.register({ name:"comp_from_takes", description:"Create a real audio track for the comp (advisory — the SDK has no audio-splicing API to actually assemble it from take sections)", category:"take-recorder", parameters:{ track_index:{type:"number",description:"Track index",required:true}, comp_name:{type:"string",description:"Comp track name",required:false} } },
    async (args: any, song: any) => {
      const source = song.tracks[args.track_index];
      const takeCount = (source?.takeLanes || []).length;
      const compTrack = await song.createAudioTrack();
      compTrack.name = args.comp_name || `COMP: ${source?.name||"takes"}`;
      return { success:true, data:{ advisory:true, note:"A real (empty) audio track was created, but the SDK has no audio-editing API to splice take sections into it — comp manually in Live's Take Lanes view, then drag the result here.", compiled:false, compTrackIndex:song.tracks.indexOf(compTrack), takeCount } };
    }
  );

  return reg;
}
