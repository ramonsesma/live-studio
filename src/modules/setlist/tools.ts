// Módulo: Setlist Manager — reutilizado de examples/setlist-manager
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

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"create_setlist", description:"Create a new setlist for live performance", category:"setlist", parameters:{ name:{type:"string",description:"Setlist name",required:true}, tempo:{type:"number",description:"Default tempo BPM",required:false}, genre:{type:"string",description:"Genre",required:false} } },
    async (args: any) => ({ success:true, data:{ name:args.name, tempo:args.tempo||120, genre:args.genre||"none", songCount:0, totalDuration:"00:00", setlistId:`set_${Date.now()}` } })
  );

  reg.register({ name:"add_song", description:"Add a song/template to the setlist", category:"setlist", parameters:{ setlist_id:{type:"string",description:"Setlist ID",required:true}, song_name:{type:"string",description:"Song name",required:true}, tempo:{type:"number",description:"Song tempo",required:false}, key:{type:"string",description:"Song key",required:false}, notes:{type:"string",description:"Performance notes",required:false} } },
    async (args: any) => ({ success:true, data:{ setlistId:args.setlist_id, song:{ name:args.song_name, tempo:args.tempo||120, key:args.key||"C", notes:args.notes||"", position:"end" } } })
  );

  reg.register({ name:"reorder_setlist", description:"Reorder songs in the setlist", category:"setlist", parameters:{ setlist_id:{type:"string",description:"Setlist ID",required:true}, song_index:{type:"number",description:"Song index to move",required:true}, new_position:{type:"number",description:"New position index",required:true} } },
    async (args: any) => ({ success:true, data:{ setlistId:args.setlist_id, movedFrom:args.song_index, movedTo:args.new_position, reordered:true } })
  );

  reg.register({ name:"export_setlist", description:"Export setlist as text/PDF/printable format", category:"setlist", parameters:{ setlist_id:{type:"string",description:"Setlist ID",required:true}, format:{type:"string",description:"Export format",required:false,enum:["text","json","csv"]} } },
    async (args: any) => {
      const format = args.format || "text";
      const now = new Date();
      return { success:true, data:{ setlistId:args.setlist_id, format, exportedAt:now.toISOString(), content:`Setlist Export\n=============\nDate: ${now.toLocaleDateString()}\nSongs: 8\nTotal Duration: 45:00\n---` } };
    }
  );

  reg.register({ name:"get_current_session", description:"Capture current session as a setlist entry", category:"setlist", parameters:{} },
    async (_a: any, song: any) => {
      const tracks = song.tracks || [];
      return { success:true, data:{ trackCount:tracks.length, trackNames:tracks.map((t: any)=>t.name).filter(Boolean), tempo:song.tempo, signature:song.signature } };
    }
  );

  return reg;
}
