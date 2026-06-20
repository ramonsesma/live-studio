// Módulo: Bulk Track Manager — reutilizado de examples/bulk-track-manager
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

  reg.register({ name:"list_tracks", description:"List all tracks with details", category:"track-manager", parameters:{ filter:{type:"string",description:"Filter by type",required:false,enum:["audio","midiaudio","group","return","master"]} } },
    async (_a: any, song: any) => {
      const tracks = (song.tracks||[]).slice(0,20).map((t: any, i: number) => ({ index:i, name:t.name||`Track ${i+1}`, type:t.type||"unknown", muted:t.mute||false, solo:t.solo||false, frozen:t.frozen||false, color:t.color||"#ccc", volume:t.mixer?.volume||-6 }));
      return { success:true, data:{ total:song.tracks?.length||0, tracks } };
    }
  );

  reg.register({ name:"bulk_action", description:"Apply action to multiple tracks at once", category:"track-manager", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices",required:true}, action:{type:"string",description:"Action to apply",required:true,enum:["mute","unmute","toggle_mute","solo","unsolo","arm","disarm","toggle_arm","freeze","unfreeze","lock","unlock"]} } },
    async (args: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      return { success:true, data:{ applied:true, action:args.action, trackCount:indices.length, trackIndices:indices } };
    }
  );

  reg.register({ name:"color_tracks", description:"Set color for multiple tracks", category:"track-manager", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices",required:true}, color:{type:"string",description:"Color hex code",required:true} } },
    async (args: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      return { success:true, data:{ colored:true, count:indices.length, color:args.color } };
    }
  );

  reg.register({ name:"set_volume", description:"Set volume for multiple tracks", category:"track-manager", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices",required:true}, volume:{type:"number",description:"Volume in dB (-inf to +12)",required:true}, relative:{type:"boolean",description:"Relative adjustment vs absolute",required:false} } },
    async (args: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      return { success:true, data:{ volumeSet:true, count:indices.length, volume:args.volume, relative:args.relative||false } };
    }
  );

  reg.register({ name:"duplicate_tracks", description:"Duplicate selected tracks", category:"track-manager", parameters:{ track_indices:{type:"string",description:"Comma-separated track indices",required:true}, with_content:{type:"boolean",description:"Duplicate content",required:false} } },
    async (args: any, song: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      const dups = indices.map((_: any, i: number) => ({ original:i, duplicate:{ name:`Track ${i+1} copy`, index:(song.tracks?.length||0)+i } }));
      return { success:true, data:{ duplicated:true, count:indices.length, withContent:args.with_content !== false, duplicates:dups } };
    }
  );

  return reg;
}
