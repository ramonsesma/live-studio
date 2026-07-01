// Módulo: Clip Launch Quantizer — Song.gridQuantization/gridIsTriplet are READ-ONLY in the SDK
// (no setter), and Clip/ClipSlot/Scene expose no launch-quantization, launch-mode, or follow-action
// property at all. Reading the real global grid setting works; everything else here is advisory.
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

const GRID_NAMES = ["none","8 bars","4 bars","2 bars","1 bar","1/2","1/4","1/8","1/16","1/32"];

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_global_quant", description:"Get Live's real global arrangement grid quantization", category:"launch-quant", parameters:{} },
    async (_a: any, song: any) => ({ success:true, data:{ globalQuantization: GRID_NAMES[song.gridQuantization] ?? String(song.gridQuantization), triplet: !!song.gridIsTriplet } })
  );

  reg.register({ name:"set_global_quant", description:"Set global launch quantization (advisory — Song.gridQuantization has no setter in the SDK; change it from Live's own quantization menu)", category:"launch-quant", parameters:{ value:{type:"string",description:"Quantization value",required:true,enum:["none","1/4","1/8","1/16","1/32","1/2","1/1"]} } },
    async (args: any) => ({ success:true, data:{ advisory:true, note:"Song.gridQuantization is read-only in the SDK — there's no API to change it. Set it from Live's quantization menu in the toolbar.", requestedValue:args.value } })
  );

  reg.register({ name:"set_clip_quant", description:"Set launch quantization for a specific clip (advisory — Clip has no launch-quantization property in the SDK)", category:"launch-quant", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, value:{type:"string",description:"Quantization value",required:true,enum:["none","1/4","1/8","1/16","1/32","global"]} } },
    async (args: any, song: any) => {
      const clip = song.tracks?.[args.track_index]?.clipSlots?.[args.clip_index]?.clip;
      if (!clip) return { success:false, error:"Clip not found" };
      return { success:true, data:{ advisory:true, note:"Clip has no launch-quantization property in the SDK — set it per-clip in Live (right-click the clip → Launch Quantization).", trackIndex:args.track_index, clipIndex:args.clip_index, requestedValue:args.value } };
    }
  );

  reg.register({ name:"get_clip_launch_modes", description:"List real clips on a track (launch mode/follow-action/quant aren't exposed by the SDK)", category:"launch-quant", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const clips = (track.clipSlots || []).map((slot: any, i: number) => slot.clip ? { index:i, name:slot.clip.name, duration:slot.clip.duration } : null).filter(Boolean);
      return { success:true, data:{ advisory:true, note:"Launch mode / follow action / per-clip quantization aren't exposed by the SDK — only real clip names/durations are listed.", trackName:track.name||"Unknown", clipCount:clips.length, clips } };
    }
  );

  reg.register({ name:"set_scene_quant", description:"Set launch quantization for a scene (advisory — Scene has no launch-quantization property in the SDK)", category:"launch-quant", parameters:{ scene_index:{type:"number",description:"Scene index",required:true}, value:{type:"string",description:"Quantization value",required:true,enum:["none","1/4","1/8","1/16","1/32","global"]} } },
    async (args: any, song: any) => {
      const scene = song.scenes?.[args.scene_index];
      if (!scene) return { success:false, error:"Scene not found" };
      return { success:true, data:{ advisory:true, note:"Scene has no launch-quantization property in the SDK.", sceneIndex:args.scene_index, sceneName:scene.name, requestedValue:args.value } };
    }
  );

  return reg;
}
