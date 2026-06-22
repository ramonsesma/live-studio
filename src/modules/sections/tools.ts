// Módulo: Secciones de Arreglo — reutilizado de examples/arrangement-sections
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

  reg.register({ name:"get_sections", description:"Detect and list arrangement sections", category:"sections", parameters:{} },
    async (_a: any, song: any) => {
      // Real arrangement markers are the Set's cue points (locators).
      const cues = (song.cuePoints || []).slice().sort((a: any, b: any) => a.time - b.time);
      const sections = cues.map((c: any, i: number) => {
        const next = cues[i + 1];
        return {
          index:i, name:c.name || `Section ${i + 1}`, startTime:c.time,
          endTime: next ? next.time : null, duration: next ? next.time - c.time : null,
          color:["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7"][i % 5],
        };
      });
      return { success:true, data:{ sectionCount:sections.length, sections } };
    }
  );

  reg.register({ name:"create_section", description:"Create a new arrangement section", category:"sections", parameters:{ name:{type:"string",description:"Section name",required:true}, start_bar:{type:"number",description:"Start bar position",required:true}, duration:{type:"number",description:"Duration in bars",required:true}, color:{type:"string",description:"Section color hex",required:false}, tempo:{type:"number",description:"Section tempo (optional)",required:false} } },
    async (args: any) => ({ success:true, data:{ created:true, name:args.name, startBar:args.start_bar, duration:args.duration, color:args.color||"#667eea", tempo:args.tempo||null, sectionId:`sec_${Date.now()}` } })
  );

  
  reg.register({ name:"duplicate_section", description:"Duplicate a section", category:"sections", parameters:{ section_index:{type:"number",description:"Section index to duplicate",required:true}, times:{type:"number",description:"Number of copies",required:false} } },
    async (args: any) => {
      const copies = args.times || 1;
      return { success:true, data:{ duplicated:true, sourceIndex:args.section_index, copies, totalDuration:32*copies } };
    }
  );

  reg.register({ name:"delete_section", description:"Delete a section", category:"sections", parameters:{ section_index:{type:"number",description:"Section index to delete",required:true}, ripple:{type:"boolean",description:"Ripple delete",required:false} } },
    async (args: any) => ({ success:true, data:{ deleted:true, sectionIndex:args.section_index, ripple:args.ripple!==false } })
  );

  
  return reg;
}
