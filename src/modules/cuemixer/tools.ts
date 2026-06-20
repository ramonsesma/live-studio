// Módulo: Cue Mixer — reutilizado de examples/cue-mixer
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

  reg.register({ name:"set_cue_mix", description:"Set cue/headphone mix for a track", category:"cue-mix", parameters:{ track_index:{type:"number",description:"Track index",required:true}, cue_level:{type:"number",description:"Cue level -inf to +12 dB",required:true}, pre_fader:{type:"boolean",description:"Pre-fader listening",required:false}, solo_cue:{type:"boolean",description:"Solo in cue",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ cueSet:true, trackName:track?.name||"Unknown", level:args.cue_level, preFader:args.pre_fader||false, solo:args.solo_cue||false } };
    }
  );

  reg.register({ name:"set_master_cue", description:"Set master cue output volume", category:"cue-mix", parameters:{ volume:{type:"number",description:"Cue master volume -inf to +12 dB",required:true}, mute_main:{type:"boolean",description:"Mute main output while cueing",required:false} } },
    async (args: any) => ({ success:true, data:{ masterCueSet:true, volume:args.volume, mainMuted:args.mute_main||false } })
  );

  reg.register({ name:"assign_cue_sends", description:"Assign cue sends for multiple tracks", category:"cue-mix", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices",required:true}, cue_send:{type:"number",description:"Cue send level 0-100%",required:true} } },
    async (args: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      return { success:true, data:{ assigned:true, trackCount:indices.length, cueSend:args.cue_send } };
    }
  );

  reg.register({ name:"toggle_cue_preview", description:"Toggle cue preview (pre-fader listen)", category:"cue-mix", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any) => ({ success:true, data:{ previewToggled:true, trackIndex:args.track_index, preFader:true } })
  );

  reg.register({ name:"get_cue_status", description:"Get cue mix status for all tracks", category:"cue-mix", parameters:{} },
    async (_a: any, song: any) => {
      const tracks = (song.tracks||[]).slice(0,8).map((t: any, i: number) => ({ index:i, name:t.name||`Track ${i+1}`, cueLevel:Math.round((Math.random()*100)), preFader:Math.random()>0.5, solo:Math.random()>0.8 }));
      return { success:true, data:{ masterCueVolume:0, mainMuted:false, trackCues:tracks } };
    }
  );

  return reg;
}
