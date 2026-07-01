// Módulo: Notas de Proyecto — persisted project notes (not tied to Live's Set state by design;
// a scratchpad). Persists to the Set's storageDirectory (src/core/storage.ts) so notes survive
// across sessions — the previous version kept them in a module-level array, lost on restart.
import { saveJson, loadJson, listJson, deleteJson } from "../../core/storage.js";
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

const SUB = "project_notes";

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"add_note", description:"Add a project note (persists to disk)", category:"notes", parameters:{ category:{type:"string",description:"Note category",required:false,enum:["general","mix","arrangement","production","todo","lyric"]}, text:{type:"string",description:"Note text",required:true}, tags:{type:"string",description:"Comma-separated tags",required:false} } },
    async (args: any) => {
      const id = `note_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
      const note = { id, timestamp:new Date().toISOString(), category:args.category||"general", text:args.text, tags:args.tags?.split(",").map((s: string)=>s.trim()).filter(Boolean)||[], pinned:false };
      saveJson(SUB, id, note);
      return { success:true, data:{ noteId:id, note, totalNotes: listJson(SUB).length } };
    }
  );

  reg.register({ name:"get_notes", description:"Get all project notes", category:"notes", parameters:{ category:{type:"string",description:"Filter by category",required:false}, query:{type:"string",description:"Search text",required:false} } },
    async (args: any) => {
      let all = listJson(SUB);
      if (args.category) all = all.filter((n: any) => n.category === args.category);
      if (args.query) { const q = args.query.toLowerCase(); all = all.filter((n: any) => n.text.toLowerCase().includes(q) || (n.tags || []).some((t: string) => t.toLowerCase().includes(q))); }
      return { success:true, data:{ count:all.length, total: listJson(SUB).length, notes: all } };
    }
  );

  reg.register({ name:"update_note", description:"Update an existing note", category:"notes", parameters:{ note_id:{type:"string",description:"Note ID (returned by add_note)",required:true}, text:{type:"string",description:"New text",required:false}, category:{type:"string",description:"New category",required:false,enum:["general","mix","arrangement","production","todo","lyric"]}, pinned:{type:"boolean",description:"Pin note",required:false} } },
    async (args: any) => {
      const n = loadJson(SUB, args.note_id);
      if (!n) return { success:false, error:`Note ${args.note_id} not found` };
      if (args.text !== undefined) n.text = args.text;
      if (args.category) n.category = args.category;
      if (args.pinned !== undefined) n.pinned = args.pinned;
      saveJson(SUB, args.note_id, n);
      return { success:true, data:{ updated:true, note:n } };
    }
  );

  reg.register({ name:"delete_note", description:"Delete a note", category:"notes", parameters:{ note_id:{type:"string",description:"Note ID",required:true} } },
    async (args: any) => { const ok = deleteJson(SUB, args.note_id); return { success:ok, data:{ deleted:ok, noteId:args.note_id }, error: ok ? undefined : `Note ${args.note_id} not found` }; }
  );

  reg.register({ name:"export_notes", description:"Export notes as text/markdown/json", category:"notes", parameters:{ format:{type:"string",description:"Export format",required:false,enum:["text","markdown","json"]} } },
    async (args: any) => {
      const notes = listJson(SUB).sort((a: any, b: any) => a.timestamp < b.timestamp ? -1 : 1);
      const fmt = args.format||"markdown";
      let content = "";
      if (fmt === "markdown") content = "# Project Notes\n\n" + notes.map((n: any) => `## [${n.category}] ${n.timestamp}\n${n.text}\n`).join("\n");
      else if (fmt === "json") content = JSON.stringify(notes, null, 2);
      else content = notes.map((n: any) => `[${n.category}] ${n.timestamp}\n${n.text}\n`).join("\n");
      return { success:true, data:{ exported:true, format:fmt, content, noteCount:notes.length } };
    }
  );

  return reg;
}
