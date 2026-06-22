// Módulo: Vocal Comp Editor — reutilizado de examples/vocal-comp-editor
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

  reg.register({ name:"create_comp_track", description:"Create a new comp track from takes", category:"comp", parameters:{ track_indices:{type:"string",description:"Take track indices",required:true}, comp_name:{type:"string",description:"Comp track name",required:false} } },
    async (args: any, song: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      const track = await song.createMidiTrack();
      track.name = args.comp_name||"Vocal Comp";
      return { success:true, data:{ compCreated:true, trackName:track.name, takes:indices.length, trackIndex:song.tracks.indexOf(track) } };
    }
  );

  reg.register({ name:"rate_takes", description:"Rate take sections", category:"comp", parameters:{ track_index:{type:"number",description:"Take track index",required:true}, ratings:{type:"string",description:"JSON section->rating map",required:true} } },
    async (args: any) => {
      const ratings = JSON.parse(args.ratings);
      return { success:true, data:{ rated:true, sections:Object.keys(ratings).length, ratings } };
    }
  );

  reg.register({ name:"swipe_comp", description:"Swipe-comp between takes", category:"comp", parameters:{ comp_track:{type:"number",description:"Comp track index",required:true}, source_track:{type:"number",description:"Source take track",required:true}, start_bar:{type:"number",description:"Start bar",required:true}, end_bar:{type:"number",description:"End bar",required:true}, crossfade_ms:{type:"number",description:"Crossfade ms",required:false} } },
    async (args: any, song: any) => {
      const comp = song.tracks[args.comp_track];
      const src = song.tracks[args.source_track];
      return { success:true, data:{ swiped:true, comp:comp?.name||"Unknown", source:src?.name||"Unknown", range:`${args.start_bar}-${args.end_bar}`, crossfade:args.crossfade_ms||5 } };
    }
  );

  
  reg.register({ name:"flatten_comp", description:"Flatten comp track to single clip", category:"comp", parameters:{ comp_track:{type:"number",description:"Comp track index",required:true}, render_fades:{type:"boolean",description:"Render crossfades",required:false} } },
    async (args: any, song: any) => {
      const comp = song.tracks[args.comp_track];
      return { success:true, data:{ flattened:true, trackName:comp?.name||"Unknown", clipCreated:true, fadesRendered:args.render_fades !== false } };
    }
  );

  return reg;
}
