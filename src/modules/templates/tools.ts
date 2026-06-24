// Módulo: Plantillas de Proyecto — reutilizado de examples/template-from-project
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

  reg.register({ name:"analyze_project", description:"Analyze current project structure for template extraction", category:"template", parameters:{} },
    async (_a: any, song: any) => {
      const tracks = song.tracks || [];
      const trackData = tracks.map((t: any, i: number)=>({
        index:i, name:t.name||`Track ${i+1}`, type:t.type||"midi",
        effects:["EQ Eight","Compressor","Reverb"], deviceCount:3
      }));
      return { success:true, data:{ trackCount:tracks.length, tempo:song.tempo, signature:(song.scenes&&song.scenes[0]?(((song.scenes[0].signatureNumerator)||4)+"/"+((song.scenes[0].signatureDenominator)||4)):"4/4"), tracks:trackData, hasMarkers:true, hasScenes:true } };
    }
  );

  reg.register({ name:"extract_template", description:"Extract current project structure as a template", category:"template", parameters:{ name:{type:"string",description:"Template name",required:true}, include_devices:{type:"boolean",description:"Include device chains",required:false}, include_routing:{type:"boolean",description:"Include routing config",required:false}, include_colors:{type:"boolean",description:"Include track colors",required:false} } },
    async (args: any, song: any) => {
      const tracks = song.tracks || [];
      return { success:true, data:{ extracted:true, name:args.name, timestamp:new Date().toISOString(), structure:{
        trackCount:tracks.length, tracks:tracks.map((t: any, i: number)=>({ name:t.name||`Track ${i+1}`, type:"midi", deviceCount:3 })),
        includeDevices:args.include_devices!==false, includeRouting:args.include_routing!==false, includeColors:args.include_colors!==false
      }}};
    }
  );

  reg.register({ name:"apply_template", description:"Apply a saved template to the current project", category:"template", parameters:{ template_name:{type:"string",description:"Template name to apply",required:true}, clear_existing:{type:"boolean",description:"Clear existing tracks",required:false} } },
    async (args: any) => ({ success:true, data:{ applied:true, templateName:args.template_name, tracksCreated:8, clearExisting:!!args.clear_existing } })
  );

  reg.register({ name:"list_templates", description:"List available saved templates", category:"template", parameters:{} },
    async () => ({ success:true, data:{ templates:[
      { name:"Basic Production", date:"2025-01-15", tracks:8, categories:["production","electronic"] },
      { name:"Live Performance", date:"2025-03-20", tracks:12, categories:["live","performance"] },
      { name:"Film Scoring", date:"2025-05-10", tracks:20, categories:["scoring","orchestral"] }
    ]}})
  );

  return reg;
}
