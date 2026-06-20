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
      const markers = song.markers || [];
      const sections = markers.length > 0 ? markers.map((m: any, i: number) => ({
        name:m.name||`Section ${i+1}`, startTime:m.time||i*16, duration:16, color:["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4"][i%4],
        tempo:Math.floor(Math.random()*30+110), energy:`${Math.floor(Math.random()*60+30)}%`
      })) : [
        { name:"Intro", startTime:0, duration:8, color:"#FF6B6B", tempo:120, energy:"30%" },
        { name:"Verse", startTime:8, duration:16, color:"#4ECDC4", tempo:120, energy:"50%" },
        { name:"Chorus", startTime:24, duration:16, color:"#45B7D1", tempo:120, energy:"80%" },
        { name:"Bridge", startTime:40, duration:8, color:"#96CEB4", tempo:120, energy:"40%" },
        { name:"Outro", startTime:48, duration:8, color:"#FFEAA7", tempo:120, energy:"20%" }
      ];
      return { success:true, data:{ sectionCount:sections.length, sections } };
    }
  );

  reg.register({ name:"create_section", description:"Create a new arrangement section", category:"sections", parameters:{ name:{type:"string",description:"Section name",required:true}, start_bar:{type:"number",description:"Start bar position",required:true}, duration:{type:"number",description:"Duration in bars",required:true}, color:{type:"string",description:"Section color hex",required:false}, tempo:{type:"number",description:"Section tempo (optional)",required:false} } },
    async (args: any) => ({ success:true, data:{ created:true, name:args.name, startBar:args.start_bar, duration:args.duration, color:args.color||"#667eea", tempo:args.tempo||null, sectionId:`sec_${Date.now()}` } })
  );

  reg.register({ name:"move_section", description:"Move/rearrange a section to a new position", category:"sections", parameters:{ section_index:{type:"number",description:"Section index to move",required:true}, new_start:{type:"number",description:"New start position in bars",required:true}, ripple:{type:"boolean",description:"Ripple edit following sections",required:false} } },
    async (args: any) => ({ success:true, data:{ moved:true, sectionIndex:args.section_index, newStart:args.new_start, ripple:args.ripple!==false } })
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

  reg.register({ name:"export_arrangement", description:"Export arrangement structure as text/diagram", category:"sections", parameters:{ format:{type:"string",description:"Export format",required:false,enum:["text","bars","time","diagram"]} } },
    async () => ({ success:true, data:{ format:"text", arrangementLayout:"| Intro (8) | Verse (16) | Chorus (16) | Bridge (8) | Chorus (16) | Outro (8) |", totalBars:72, totalDuration:"96 seconds at 120 BPM" } })
  );

  return reg;
}
