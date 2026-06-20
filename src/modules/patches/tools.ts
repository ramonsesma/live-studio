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

  reg.register({ name:"browse_patches", description:"Browse available patches/presets", category:"patch-browser", parameters:{ type:{type:"string",description:"Plugin/device type",required:false,enum:["synth","sampler","drum","fx","utility","instrument"]}, search:{type:"string",description:"Search query",required:false}, tags:{type:"string",description:"Comma-separated tags",required:false} } },
    async (args: any) => {
      const names = ["Analog Pad","Deep Bass","Lead Synth","Pluck","Wobble","Atmo Pad","Acid Bass","Hard Saw","FM Bell","Sub Bass","Brass","Strings","Flute Synth","Arp","Organ","Noise"];
      const types = ["synth","synth","synth","synth","fx","synth","synth","synth","synth","synth","synth","instrument","instrument","synth","instrument","fx"];
      const tags = ["analog","pad","warm","digital","aggressive","ambient","acid","hard","FM","sub","brass","string","flute","arp","organ","noise"];
      const patches = Array.from({length:16}, (_, i) => ({ id:i+1, name:names[i], type:args.type||types[i], tags:tags[i], author:"User", rating:Math.floor(Math.random()*3+3), date:"2026-06" }));
      return { success:true, data:{ patches, totalPatches:342, type:args.type||"all", searchQuery:args.search||"" } };
    }
  );

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
