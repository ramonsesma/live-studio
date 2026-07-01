// Módulo: Performance & Looper — the SDK exposes no transport/record/clip-fire control at all
// (no play(), no record-enable trigger, no session/arrangement view switch), so anything implying
// real-time performance action is honestly advisory. What IS real: reading/toggling arm/mute/solo
// and creating a real scene.
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

  reg.register({ name:"start_loop_recording", description:"List armed tracks that would receive loop recording (advisory — the SDK has no record/transport control to actually start recording)", category:"performance", parameters:{ length:{type:"number",description:"Loop length in bars",required:true}, track_indices:{type:"array",description:"Tracks to record on",required:false} } },
    async (args: any, song: any) => {
      const tracks = args.track_indices ? args.track_indices.map((i: number) => song.tracks[i]).filter(Boolean) : song.tracks.filter((t: any) => t.arm);
      if (tracks.length === 0) return { success:false, error:"No armed tracks found" };
      return { success:true, data:{ advisory:true, note:"The SDK has no transport/record-trigger API — press Record in Live for these tracks.", loopLength:args.length, tracks:tracks.map((t: any) => ({ trackIndex:song.tracks.indexOf(t), trackName:t.name, armed:true })) } };
    }
  );

  reg.register({ name:"toggle_mute", description:"Toggle track mute for performance (undoable — real)", category:"performance", parameters:{ track_index:{type:"number",description:"Track",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:`Track ${args.track_index} not found` };
      track.mute = !track.mute;
      return { success:true, data:{ trackIndex:args.track_index, muted:track.mute } };
    }
  );

  reg.register({ name:"set_performance_mode", description:"Switch between Session and Arrangement view (advisory — the SDK has no API to switch Live's main view)", category:"performance", parameters:{ mode:{type:"string",description:"Mode",required:true,enum:["session","arrangement"]}, auto_quantize:{type:"boolean",description:"Auto-quantize (also unsupported — see launchquant module)",required:false} } },
    async (args: any) => ({ success:true, data:{ advisory:true, note:"Switching Session/Arrangement view (Tab) isn't exposed by the SDK — do it in Live directly.", requestedMode:args.mode } })
  );

  reg.register({ name:"create_performance_scene", description:"Create a real scene", category:"performance", parameters:{ name:{type:"string",description:"Scene name",required:true}, includes:{type:"array",description:"Tracks to include (advisory — populating clips isn't done here)",required:false} } },
    async (args: any, song: any) => {
      const scene = await song.createScene(-1);
      scene.name = args.name;
      return { success:true, data:{ sceneIndex:song.scenes.indexOf(scene), name:scene.name } };
    }
  );

  reg.register({ name:"get_performance_state", description:"Get current performance state (isPlaying/metronome/currentScene are always null — the SDK has no transport-state read API)", category:"performance", parameters:{} },
    async (_a: any, song: any) => ({
      success:true, data:{
        isPlaying:null, tempo:song.tempo, metronome:null,
        armedTracks:song.tracks.map((t: any, i: number) => ({ trackIndex:i, name:t.name, armed:t.arm, mute:t.mute, solo:t.solo })),
        currentScene:null,
        advisory:true, note:"isPlaying/metronome/currentScene are always null — the SDK exposes no transport-state read API."
      }
    })
  );

  reg.register({ name:"trigger_fill", description:"Trigger a fill/transition (advisory — the SDK has no transport/clip-fire control to actually trigger anything in real time)", category:"performance", parameters:{ type:{type:"string",description:"Fill type",required:true,enum:["drum_fill","riser","sweep","break","stutter"]}, intensity:{type:"number",description:"Intensity 1-10",required:false} } },
    async (args: any) => ({ success:true, data:{ advisory:true, note:"There's no real-time trigger/transport API in the SDK — build the fill as a real clip ahead of time (e.g. with the Drum Programmer or Step Sequencer module) and launch it in Live.", fillType:args.type, intensity:args.intensity||5 } })
  );

  return reg;
}
