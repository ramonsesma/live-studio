// Módulo: Patch Browser — reutilizado de examples/patch-browser
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

  
  reg.register({ name:"load_patch", description:"Load a patch/preset into a device on a track", category:"patch-browser", parameters:{ patch_id:{type:"number",description:"Patch ID",required:true}, track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index on track",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ patchLoaded:true, patchId:args.patch_id, trackName:track?.name||"Unknown", deviceIndex:args.device_index||0 } };
    }
  );

  reg.register({ name:"preview_patch", description:"Preview a patch without loading it", category:"patch-browser", parameters:{ patch_id:{type:"number",description:"Patch ID",required:true}, duration:{type:"number",description:"Preview duration seconds",required:false} } },
    async (args: any) => ({ success:true, data:{ previewing:true, patchId:args.patch_id, duration:args.duration||3, status:"Previewing via MIDI note" } })
  );

  reg.register({ name:"save_patch", description:"Save current device state as a new patch", category:"patch-browser", parameters:{ name:{type:"string",description:"Patch name",required:true}, tags:{type:"string",description:"Comma-separated tags",required:false}, track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true}, category:{type:"string",description:"Patch category",required:false,enum:["synth","fx","drum","instrument"]} } },
    async (args: any) => ({ success:true, data:{ saved:true, name:args.name, patchId:Date.now(), category:args.category||"synth" } })
  );

  reg.register({ name:"rate_patch", description:"Rate a patch", category:"patch-browser", parameters:{ patch_id:{type:"number",description:"Patch ID",required:true}, rating:{type:"number",description:"Rating 1-5",required:true} } },
    async (args: any) => ({ success:true, data:{ rated:true, patchId:args.patch_id, rating:Math.min(Math.max(args.rating,1),5), newAverageRating:4.2 } })
  );

  return reg;
}
