// Módulo: Notas de Proyecto — reutilizado de examples/project-notes
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
  let notes: any[] = [];

  reg.register({ name:"add_note", description:"Add a project note", category:"notes", parameters:{ category:{type:"string",description:"Note category",required:false,enum:["general","mix","arrangement","production","todo","lyric"]}, text:{type:"string",description:"Note text",required:true}, tags:{type:"string",description:"Comma-separated tags",required:false} } },
    async (args: any) => {
      const note = { id:notes.length+1, timestamp:new Date().toISOString(), category:args.category||"general", text:args.text, tags:args.tags?.split(",").map((s: string)=>s.trim())||[], pinned:false };
      notes.push(note);
      const idx = notes.indexOf(note);
      return { success:true, data:{ noteId:idx+1, note, totalNotes:notes.length } };
    }
  );

  reg.register({ name:"get_notes", description:"Get all project notes", category:"notes", parameters:{ category:{type:"string",description:"Filter by category",required:false}, query:{type:"string",description:"Search text",required:false} } },
    async (args: any) => {
      let filtered = [...notes];
      if (args.category) filtered = filtered.filter((n: any) => n.category === args.category);
      if (args.query) { const q = args.query.toLowerCase(); filtered = filtered.filter((n: any) => n.text.toLowerCase().includes(q) || n.tags.some((t: string)=>t.toLowerCase().includes(q))); }
      return { success:true, data:{ count:filtered.length, total:notes.length, notes:filtered } };
    }
  );

  reg.register({ name:"update_note", description:"Update an existing note", category:"notes", parameters:{ note_id:{type:"number",description:"Note ID",required:true}, text:{type:"string",description:"New text",required:false}, category:{type:"string",description:"New category",required:false,enum:["general","mix","arrangement","production","todo","lyric"]}, pinned:{type:"boolean",description:"Pin note",required:false} } },
    async (args: any) => {
      const n = notes.find((n: any) => n.id === args.note_id);
      if (!n) return { success:false, error:`Note ${args.note_id} not found` };
      if (args.text !== undefined) n.text = args.text;
      if (args.category) n.category = args.category;
      if (args.pinned !== undefined) n.pinned = args.pinned;
      return { success:true, data:{ updated:true, note:n } };
    }
  );

  reg.register({ name:"delete_note", description:"Delete a note", category:"notes", parameters:{ note_id:{type:"number",description:"Note ID",required:true} } },
    async (args: any) => {
      const idx = notes.findIndex((n: any) => n.id === args.note_id);
      if (idx === -1) return { success:false, error:`Note ${args.note_id} not found` };
      notes.splice(idx, 1);
      return { success:true, data:{ deleted:true, noteId:args.note_id } };
    }
  );

  reg.register({ name:"export_notes", description:"Export notes as text/markdown", category:"notes", parameters:{ format:{type:"string",description:"Export format",required:false,enum:["text","markdown","json"]} } },
    async (args: any) => {
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
