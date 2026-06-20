// Módulo: Track Color Coordinator — reutilizado de examples/track-color-coordinator
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

const COLORS: any[] = [
  { name:"Red", hex:"#FF0000", rgb:[255,0,0] }, { name:"Orange", hex:"#FF8C00", rgb:[255,140,0] },
  { name:"Yellow", hex:"#FFD700", rgb:[255,215,0] }, { name:"Green", hex:"#32CD32", rgb:[50,205,50] },
  { name:"Teal", hex:"#20B2AA", rgb:[32,178,170] }, { name:"Blue", hex:"#4169E1", rgb:[65,105,225] },
  { name:"Purple", hex:"#9370DB", rgb:[147,112,219] }, { name:"Pink", hex:"#FF69B4", rgb:[255,105,180] }
];

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_tracks", description:"List all tracks with their current colors", category:"colors", parameters:{} },
    async (_a: any, song: any) => {
      const tracks = song.tracks || [];
      return { success:true, data:{ trackCount:tracks.length, tracks:tracks.map((t: any, i: number)=>({ index:i, name:t.name||`Track ${i+1}`, color:t.color||COLORS[i%COLORS.length].hex, type:t.type||"unknown" })) } };
    }
  );

  reg.register({ name:"apply_color_scheme", description:"Apply a color scheme to all tracks", category:"colors", parameters:{ scheme:{type:"string",description:"Color scheme",required:true,enum:["by-type","rainbow","gradient","vintage","neon","pastel","monochrome"]}, reverse:{type:"boolean",description:"Reverse color order",required:false} } },
    async (args: any, song: any) => {
      const tracks = song.tracks || [];
      return { success:true, data:{ applied:true, scheme:args.scheme, tracksColored:tracks.length, reverse:!!args.reverse, colors:tracks.map((_: any, i: number)=>COLORS[i%COLORS.length].hex) } };
    }
  );

  reg.register({ name:"set_track_color", description:"Set a single track's color", category:"colors", parameters:{ track_index:{type:"number",description:"Track index",required:true}, color:{type:"string",description:"Hex color or color name",required:true} } },
    async (args: any) => {
      const color = COLORS.find((c: any)=>c.name.toLowerCase()===String(args.color).toLowerCase());
      return { success:true, data:{ trackIndex:args.track_index, color:color?.hex||args.color, set:true } };
    }
  );

  reg.register({ name:"export_color_map", description:"Export current track colors as a mapping", category:"colors", parameters:{ format:{type:"string",description:"Export format",required:false,enum:["json","csv","ableton"]} } },
    async (args: any, song: any) => {
      const tracks = song.tracks || [];
      return { success:true, data:{ format:args.format||"json", colorMap:tracks.map((t: any, i: number)=>({ trackIndex:i, name:t.name||`Track ${i+1}`, color:t.color||COLORS[i%COLORS.length].hex })) } };
    }
  );

  return reg;
}
