// Módulo: EQ Match — reutilizado de examples/eq-matcher
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

  
  reg.register({ name:"capture_reference", description:"Capture frequency spectrum from a reference track", category:"eq-match", parameters:{ track_index:{type:"number",description:"Reference track index",required:true}, clip_index:{type:"number",description:"Clip index",required:false}, name:{type:"string",description:"Reference profile name",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ captured:true, trackName:track?.name||"Unknown", profileName:args.name||`Reference: ${track?.name}`, bands:32, profileId:`ref_${Date.now()}` } };
    }
  );

  reg.register({ name:"match_eq", description:"Match EQ of target track to reference profile", category:"eq-match", parameters:{ target_track:{type:"number",description:"Target track index",required:true}, reference_track:{type:"number",description:"Reference track index",required:true}, strength:{type:"number",description:"Match strength 0-100%",required:false}, smoothing:{type:"number",description:"EQ curve smoothing",required:false}, bands:{type:"number",description:"Number of EQ bands",required:false,enum:[3,6,12]} } },
    async (args: any) => ({ success:true, data:{ matched:true, targetTrack:args.target_track, referenceTrack:args.reference_track, strength:args.strength||70, smoothing:args.smoothing||3, bands:args.bands||6, curve:[
      { freq:60, gain:2.5, Q:1.0 }, { freq:200, gain:-1.8, Q:0.8 }, { freq:1000, gain:0.5, Q:1.2 }, { freq:4000, gain:3.0, Q:1.5 }, { freq:10000, gain:-2.0, Q:0.7 }
    ]}})
  );

  
  reg.register({ name:"list_profiles", description:"List saved EQ reference profiles", category:"eq-match", parameters:{} },
    async () => ({ success:true, data:{ profiles:[
      { name:"Pop Master (Reference)", source:"Billie Eilish - Happier", date:"2025-04-15", bands:6 },
      { name:"Warm Vinyl", source:"Custom", date:"2025-05-20", bands:3 },
      { name:"Modern Hip-Hop", source:"Travis Scott - SICKO", date:"2025-06-01", bands:12 }
    ]}})
  );

  return reg;
}
