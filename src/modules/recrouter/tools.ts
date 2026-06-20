// Módulo: Recording Router — reutilizado de examples/recording-router
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

  reg.register({ name:"create_track", description:"Create a new recording track", category:"recording-router", parameters:{ name:{type:"string",description:"Track name",required:true}, input_source:{type:"string",description:"Input source",required:false}, type:{type:"string",description:"Track type",required:false,enum:["audio","midi","resampling"]}, channel_count:{type:"number",description:"Input channels 1-2",required:false} } },
    async (args: any, song: any) => {
      const track = await song.createMidiTrack();
      track.name = args.name;
      return { success:true, data:{ created:true, trackName:args.name, trackIndex:song.tracks.indexOf(track), inputSource:args.input_source||"Master", type:args.type||"audio" } };
    }
  );

  reg.register({ name:"route_source", description:"Route an input source to a recording track", category:"recording-router", parameters:{ track_index:{type:"number",description:"Track index",required:true}, source:{type:"string",description:"Audio source",required:true,enum:["external_1","external_2","external_3","master","resampling","bounce"]}, input_config:{type:"string",description:"Input configuration",required:false,enum:["mono","stereo"]} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ routed:true, trackName:track?.name||"Unknown", source:args.source, config:args.input_config||"stereo" } };
    }
  );

  reg.register({ name:"set_punch_range", description:"Set punch-in/out range for recording", category:"recording-router", parameters:{ start_bar:{type:"number",description:"Punch-in bar",required:true}, end_bar:{type:"number",description:"Punch-out bar",required:true}, punch_in:{type:"boolean",description:"Enable punch-in",required:false}, punch_out:{type:"boolean",description:"Enable punch-out",required:false} } },
    async (args: any) => ({ success:true, data:{ punchSet:true, startBar:args.start_bar, endBar:args.end_bar, punchIn:args.punch_in !== false, punchOut:args.punch_out !== false } })
  );

  reg.register({ name:"start_recording", description:"Start recording on selected track", category:"recording-router", parameters:{ track_index:{type:"number",description:"Track index",required:true}, count_in:{type:"number",description:"Count-in bars",required:false}, monitor:{type:"string",description:"Monitor mode",required:false,enum:["auto","in","off"]}, metronome:{type:"boolean",description:"Enable metronome",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ recording:true, trackName:track?.name||"Unknown", countIn:args.count_in||0, monitor:args.monitor||"auto", metronome:args.metronome !== false } };
    }
  );

  reg.register({ name:"stop_recording", description:"Stop recording", category:"recording-router", parameters:{ save:{type:"boolean",description:"Save recorded clip",required:false}, discard:{type:"boolean",description:"Discard recording",required:false} } },
    async (args: any) => {
      if (args.discard) return { success:true, data:{ stopped:true, saved:false, discarded:true, recordedDuration:"0:16", clipCreated:false, takes:0 } };
      return { success:true, data:{ stopped:true, saved:true, recordedDuration:"0:16", clipCreated:true, takes:1 } };
    }
  );

  return reg;
}
