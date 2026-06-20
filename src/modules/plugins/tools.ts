// Módulo: Plugin Browser — reutilizado de examples/plugin-browser
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

  reg.register({ name:"scan_plugins", description:"Scan all installed VST3/AU plugins", category:"plugins", parameters:{ refresh:{type:"boolean",description:"Force rescan",required:false} } },
    async () => {
      const plugins = [
        { name:"Serum", type:"VST3", manufacturer:"Xfer", version:"1.35", format:["VST3","AU"], category:"Synth", favorites:true },
        { name:"Massive X", type:"VST3", manufacturer:"Native Instruments", version:"1.4.2", format:["VST3","AU"], category:"Synth", favorites:true },
        { name:"Valhalla Shimmer", type:"AU", manufacturer:"Valhalla DSP", version:"2.0", format:["AU"], category:"Reverb", favorites:false },
        { name:"Pro-Q 3", type:"VST3", manufacturer:"FabFilter", version:"3.25", format:["VST3","AU"], category:"EQ", favorites:true },
        { name:"H-Delay", type:"VST3", manufacturer:"Waves", version:"14.0", format:["VST3"], category:"Delay", favorites:false },
        { name:"Shimmerverb", type:"AU", manufacturer:"Soundtoys", version:"5.4", format:["VST3","AU"], category:"Reverb", favorites:true }
      ];
      return { success:true, data:{ totalPlugins:plugins.length, categories:["Synth","Reverb","EQ","Delay","Compressor","Distortion","Modulation"], plugins } };
    }
  );

  reg.register({ name:"search_plugins", description:"Search plugins by name, category, or manufacturer", category:"plugins", parameters:{ query:{type:"string",description:"Search query",required:true}, category:{type:"string",description:"Filter by category",required:false,enum:["Synth","Reverb","EQ","Delay","Compressor","Distortion","Modulation","All"]}, format:{type:"string",description:"Filter by format",required:false,enum:["VST3","AU","AAX"]} } },
    async (args: any) => {
      const results = [
        { name:"Serum", manufacturer:"Xfer", category:"Synth", rating:4.8 },
        { name:"Phase Plant", manufacturer:"Kilohearts", category:"Synth", rating:4.6 }
      ];
      return { success:true, data:{ query:args.query, resultCount:results.length, results } };
    }
  );

  reg.register({ name:"add_to_track", description:"Add a plugin to a track", category:"plugins", parameters:{ track_index:{type:"number",description:"Track index",required:true}, plugin_name:{type:"string",description:"Plugin name",required:true}, preset:{type:"string",description:"Initial preset name",required:false}, device_index:{type:"number",description:"Insert position index",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ added:true, trackName:track?.name||"Unknown", plugin:args.plugin_name, preset:args.preset||"Default", position:args.device_index||"end" } };
    }
  );

  reg.register({ name:"get_favorites", description:"List favorite/tagged plugins", category:"plugins", parameters:{ tag:{type:"string",description:"Filter by tag",required:false} } },
    async () => ({ success:true, data:{ favorites:[
      { name:"Serum", tags:["synth","bass","leads"], lastUsed:"2025-06-10" },
      { name:"Pro-Q 3", tags:["eq","mastering"], lastUsed:"2025-06-15" },
      { name:"Valhalla Shimmer", tags:["reverb","ambient"], lastUsed:"2025-06-12" }
    ]}})
  );

  reg.register({ name:"toggle_favorite", description:"Toggle plugin as favorite", category:"plugins", parameters:{ plugin_name:{type:"string",description:"Plugin name",required:true} } },
    async (args: any) => ({ success:true, data:{ plugin:args.plugin_name, isFavorite:true } })
  );

  return reg;
}
