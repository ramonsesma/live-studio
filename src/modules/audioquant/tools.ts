// Módulo: Audio Quantizer — reutilizado de examples/audio-quantizer
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

  
  
  reg.register({ name:"set_warp_mode", description:"Set warp mode for audio clip", category:"audio-quantize", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, mode:{type:"string",description:"Warp mode",required:true,enum:["beats","tones","textures","re-pitch","complex","complex-pro"]} } },
    async (args: any) => ({ success:true, data:{ set:true, mode:args.mode, clipIndex:args.clip_index, trackIndex:args.track_index } })
  );

  
  return reg;
}
