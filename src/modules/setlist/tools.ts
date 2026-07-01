// Módulo: Setlist Manager — persists real setlists to disk (src/core/storage.ts) instead of
// echoing args back with nothing saved anywhere. create_setlist/add_song/reorder_setlist now
// actually build and mutate a stored setlist; list/delete added to make it a complete CRUD.
import { saveJson, loadJson, listJson, deleteJson } from "../../core/storage.js";
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

const SUB = "setlists";

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"create_setlist", description:"Create a new setlist for live performance (persists to disk)", category:"setlist", parameters:{ name:{type:"string",description:"Setlist name",required:true}, tempo:{type:"number",description:"Default tempo BPM",required:false}, genre:{type:"string",description:"Genre",required:false} } },
    async (args: any) => {
      const id = `set_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
      const setlist = { id, name:args.name, tempo:args.tempo||120, genre:args.genre||"none", songs:[] as any[], createdAt:new Date().toISOString() };
      saveJson(SUB, id, setlist);
      return { success:true, data:{ setlistId:id, name:setlist.name, tempo:setlist.tempo, genre:setlist.genre, songCount:0 } };
    }
  );

  reg.register({ name:"add_song", description:"Add a song/template to a saved setlist (persists to disk)", category:"setlist", parameters:{ setlist_id:{type:"string",description:"Setlist ID",required:true}, song_name:{type:"string",description:"Song name",required:true}, tempo:{type:"number",description:"Song tempo",required:false}, key:{type:"string",description:"Song key",required:false}, notes:{type:"string",description:"Performance notes",required:false} } },
    async (args: any) => {
      const setlist = loadJson(SUB, args.setlist_id);
      if (!setlist) return { success:false, error:`Setlist ${args.setlist_id} not found` };
      const entry = { name:args.song_name, tempo:args.tempo||setlist.tempo||120, key:args.key||"C", notes:args.notes||"" };
      setlist.songs.push(entry);
      saveJson(SUB, args.setlist_id, setlist);
      return { success:true, data:{ setlistId:args.setlist_id, song:entry, position:setlist.songs.length - 1, songCount:setlist.songs.length } };
    }
  );

  reg.register({ name:"reorder_setlist", description:"Reorder songs in a saved setlist (persists to disk)", category:"setlist", parameters:{ setlist_id:{type:"string",description:"Setlist ID",required:true}, song_index:{type:"number",description:"Song index to move",required:true}, new_position:{type:"number",description:"New position index",required:true} } },
    async (args: any) => {
      const setlist = loadJson(SUB, args.setlist_id);
      if (!setlist) return { success:false, error:`Setlist ${args.setlist_id} not found` };
      const songs = setlist.songs;
      if (args.song_index < 0 || args.song_index >= songs.length) return { success:false, error:`song_index ${args.song_index} out of range (0-${songs.length - 1})` };
      const [moved] = songs.splice(args.song_index, 1);
      const to = Math.max(0, Math.min(songs.length, args.new_position));
      songs.splice(to, 0, moved);
      saveJson(SUB, args.setlist_id, setlist);
      return { success:true, data:{ setlistId:args.setlist_id, movedFrom:args.song_index, movedTo:to, songs:songs.map((s: any) => s.name) } };
    }
  );

  reg.register({ name:"list_setlists", description:"List saved setlists", category:"setlist", parameters:{} },
    async () => ({ success:true, data:{ setlists: listJson(SUB).map((s: any) => ({ id:s.id, name:s.name, tempo:s.tempo, genre:s.genre, songCount:(s.songs||[]).length, createdAt:s.createdAt })) } })
  );

  reg.register({ name:"delete_setlist", description:"Delete a saved setlist", category:"setlist", parameters:{ setlist_id:{type:"string",description:"Setlist ID",required:true} } },
    async (args: any) => { const ok = deleteJson(SUB, args.setlist_id); return { success:ok, data:{ deleted:ok, setlistId:args.setlist_id }, error: ok ? undefined : `Setlist ${args.setlist_id} not found` }; }
  );

  reg.register({ name:"get_current_session", description:"Capture the current Live session's real state (tracks, tempo, signature) as a setlist entry candidate", category:"setlist", parameters:{} },
    async (_a: any, song: any) => {
      const tracks = song.tracks || [];
      return { success:true, data:{ trackCount:tracks.length, trackNames:tracks.map((t: any)=>t.name).filter(Boolean), tempo:song.tempo, signature:(song.scenes&&song.scenes[0]?(((song.scenes[0].signatureNumerator)||4)+"/"+((song.scenes[0].signatureDenominator)||4)):"4/4") } };
    }
  );

  return reg;
}
