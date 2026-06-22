// Módulo: Performance & Looper — reutilizado de examples/performance-extensions
export class ToolRegistry {
  private handlers = new Map();
  definitions: any[] = [];
  register(def: any, handler: any) { this.definitions.push(def); this.handlers.set(def.name, handler); }
  async execute(name: string, args: any, song: any) {
    const handler = this.handlers.get(name);
    if (!handler) return { success: false, error: `Unknown: ${name}` };
    try { return await handler(args, song); }
    catch (err: any) { return { success: false, error: err.message || String(err) }; }
  }
  getDefinitionsJson() { return this.definitions; }
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"start_loop_recording", description:"Start loop recording on armed tracks", category:"performance", parameters:{ length:{type:"number",description:"Loop length in bars",required:true}, track_indices:{type:"array",description:"Tracks to record on",required:false} } },
    async (args: any, song: any) => {
      const tracks = args.track_indices ? args.track_indices.map((i: number) => song.tracks[i]).filter(Boolean) : song.tracks.filter((t: any) => t.arm);
      if (tracks.length === 0) return { success:false, error:"No armed tracks found" };
      return { success:true, data:{ loopLength:args.length, tracks:tracks.map((t: any) => ({ trackIndex:song.tracks.indexOf(t), trackName:t.name, armed:true })) } };
    }
  );

  
  reg.register({ name:"toggle_mute", description:"Toggle track mute for performance", category:"performance", parameters:{ track_index:{type:"number",description:"Track",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:`Track ${args.track_index} not found` };
      track.mute = !track.mute;
      return { success:true, data:{ trackIndex:args.track_index, muted:track.mute } };
    }
  );

  reg.register({ name:"set_performance_mode", description:"Set performance mode (session/arrangement)", category:"performance", parameters:{ mode:{type:"string",description:"Mode",required:true,enum:["session","arrangement"]}, auto_quantize:{type:"boolean",description:"Auto-quantize",required:false} } },
    async (args: any) => ({ success:true, data:{ mode:args.mode, autoQuantize:args.auto_quantize||true } })
  );

  reg.register({ name:"assign_to_midi", description:"Assign a parameter to MIDI controller", category:"performance", parameters:{ track_index:{type:"number",description:"Track",required:true}, device_index:{type:"number",description:"Device index",required:true}, parameter_name:{type:"string",description:"Parameter name",required:true}, midi_cc:{type:"number",description:"MIDI CC number",required:true} } },
    async (args: any) => ({ success:true, data:{ assigned:true, trackIndex:args.track_index, deviceIndex:args.device_index, parameter:args.parameter_name, cc:args.midi_cc } })
  );

  reg.register({ name:"create_performance_scene", description:"Create a scene optimized for performance", category:"performance", parameters:{ name:{type:"string",description:"Scene name",required:true}, includes:{type:"array",description:"Tracks to include",required:false} } },
    async (args: any, song: any) => {
      const scene = await song.createScene(-1);
      scene.name = args.name;
      return { success:true, data:{ sceneIndex:song.scenes.indexOf(scene), name:scene.name } };
    }
  );

  reg.register({ name:"get_performance_state", description:"Get current performance state", category:"performance", parameters:{} },
    async (_a: any, song: any) => ({
      success:true, data:{
        isPlaying:song.isPlaying, tempo:song.tempo, metronome:song.metronome,
        armedTracks:song.tracks.map((t: any, i: number) => ({ trackIndex:i, name:t.name, armed:t.arm, mute:t.mute, solo:t.solo })),
        currentScene:null
      }
    })
  );

  reg.register({ name:"trigger_fill", description:"Trigger a fill/transition", category:"performance", parameters:{ type:{type:"string",description:"Fill type",required:true,enum:["drum_fill","riser","sweep","break","stutter"]}, intensity:{type:"number",description:"Intensity 1-10",required:false} } },
    async (args: any) => ({ success:true, data:{ triggered:true, fillType:args.type, intensity:args.intensity||5 } })
  );

  return reg;
}
