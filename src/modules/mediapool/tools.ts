// Módulo: Media Pool — reutilizado de examples/media-pool
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
  const mediaItems: any[] = [
    { id:1, name:"Kick 909.wav", type:"audio", size:"1.2 MB", duration:"0:04", tags:["drums","kick"], date:"2026-06-15" },
    { id:2, name:"Snare Acoustic.wav", type:"audio", size:"0.8 MB", duration:"0:03", tags:["drums","snare"], date:"2026-06-14" },
    { id:3, name:"Pad Synth.aif", type:"audio", size:"4.5 MB", duration:"0:12", tags:["synth","pad"], date:"2026-06-13" },
    { id:4, name:"Guitar Riff.wav", type:"audio", size:"3.2 MB", duration:"0:08", tags:["guitar","riff"], date:"2026-06-12" },
    { id:5, name:"Vocal Take 1.wav", type:"audio", size:"6.7 MB", duration:"0:16", tags:["vocal","verse"], date:"2026-06-11" },
  ];

  reg.register({ name:"list_all", description:"List all media pool items", category:"media-pool", parameters:{ type:{type:"string",description:"Filter by type",required:false,enum:["audio","midi","video","all"]}, query:{type:"string",description:"Search name/tags",required:false}, sort:{type:"string",description:"Sort order",required:false,enum:["name","date","size","type"]} } },
    async (args: any) => {
      let items = [...mediaItems];
      if (args.type && args.type !== "all") items = items.filter((i: any) => i.type === args.type);
      if (args.query) { const q = String(args.query).toLowerCase(); items = items.filter((i: any) => i.name.toLowerCase().includes(q) || i.tags.some((t: string)=>t.includes(q))); }
      return { success:true, data:{ items, total:mediaItems.length, filtered:items.length } };
    }
  );

  reg.register({ name:"import_file", description:"Import a file into the media pool", category:"media-pool", parameters:{ name:{type:"string",description:"File name",required:true}, type:{type:"string",description:"File type",required:true,enum:["audio","midi","video"]}, tags:{type:"string",description:"Comma-separated tags",required:false} } },
    async (args: any) => ({ success:true, data:{ imported:true, name:args.name, type:args.type, id:Date.now() } })
  );

  reg.register({ name:"preview", description:"Preview/poke media item", category:"media-pool", parameters:{ item_id:{type:"number",description:"Item ID to preview",required:true} } },
    async (args: any) => {
      const item = mediaItems.find((i: any) => i.id === args.item_id);
      if (!item) return { success:false, error:`Item ${args.item_id} not found` };
      return { success:true, data:{ previewing:true, item:item.name, duration:item.duration, status:"Playing preview" } };
    }
  );

  reg.register({ name:"add_to_track", description:"Add media item to a track", category:"media-pool", parameters:{ item_id:{type:"number",description:"Media item ID",required:true}, track_index:{type:"number",description:"Track index",required:true}, time:{type:"number",description:"Insert time in beats",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      const item = mediaItems.find((i: any) => i.id === args.item_id);
      return { success:true, data:{ added:true, track:track?.name||"Unknown", item:item?.name||"Unknown", time:args.time||0 } };
    }
  );

  reg.register({ name:"organize_pool", description:"Organize/filter/sort media pool", category:"media-pool", parameters:{ collection:{type:"string",description:"Collection folder name",required:false}, sort_by:{type:"string",description:"Sort by",required:false,enum:["name","date","size","duration","type"]}, ascending:{type:"boolean",description:"Ascending order",required:false} } },
    async (args: any) => ({ success:true, data:{ organized:true, collection:args.collection||"All", sortedBy:args.sort_by||"name", ascending:args.ascending !== false, itemCount:mediaItems.length } })
  );

  return reg;
}
