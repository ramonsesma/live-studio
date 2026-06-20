// Módulo: Clip Launch Quantizer — reutilizado de examples/clip-launch-quantizer
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

  reg.register({ name:"get_global_quant", description:"Get global launch quantization setting", category:"launch-quant", parameters:{} },
    async (_a: any, song: any) => ({ success:true, data:{ globalQuantization:song.launchQuantization||"1/16", clipCount:0 } })
  );

  reg.register({ name:"set_global_quant", description:"Set global launch quantization", category:"launch-quant", parameters:{ value:{type:"string",description:"Quantization value",required:true,enum:["none","1/4","1/8","1/16","1/32","1/2","1/1"]} } },
    async (args: any) => ({ success:true, data:{ set:true, globalQuant:args.value, appliedToAllClips:false } })
  );

  reg.register({ name:"set_clip_quant", description:"Set launch quantization for a specific clip", category:"launch-quant", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, value:{type:"string",description:"Quantization value",required:true,enum:["none","1/4","1/8","1/16","1/32","global"]} } },
    async (args: any) => ({ success:true, data:{ set:true, trackIndex:args.track_index, clipIndex:args.clip_index, quant:args.value, override:args.value !== "global" } })
  );

  reg.register({ name:"get_clip_launch_modes", description:"List all clips with their launch modes", category:"launch-quant", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      const clips = Array.from({length:4}, (_, i) => ({ index:i, name:`Clip ${i+1}`, launchQuant:["global","1/16","1/8","1/4"][i], launchMode:["trigger","gate","toggle","repeat"][i], followAction:"none" }));
      return { success:true, data:{ trackName:track?.name||"Unknown", clipCount:clips.length, clips } };
    }
  );

  reg.register({ name:"set_scene_quant", description:"Set launch quantization for a scene", category:"launch-quant", parameters:{ scene_index:{type:"number",description:"Scene index",required:true}, value:{type:"string",description:"Quantization value",required:true,enum:["none","1/4","1/8","1/16","1/32","global"]} } },
    async (args: any) => ({ success:true, data:{ set:true, sceneIndex:args.scene_index, quant:args.value } })
  );

  return reg;
}
