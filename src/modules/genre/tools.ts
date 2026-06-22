// Módulo: Clasificador de Género — reutilizado de examples/genre-classifier
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

const GENRE_PROFILES: any = {
  pop:  { name:"Pop", bpmRange:[100,130], energy:"high", complexity:"medium", characteristics:["catchy","vocal","bright"], typicalKeys:["C","G","D","A","F"], instruments:["synth","guitar","drums","bass","vocals"] },
  rock: { name:"Rock", bpmRange:[80,140], energy:"high", complexity:"medium", characteristics:["guitar","power","driving"], typicalKeys:["E","A","D","G","C"], instruments:["guitar","bass","drums","vocals"] },
  jazz: { name:"Jazz", bpmRange:[60,180], energy:"medium", complexity:"high", characteristics:["complex","improvisation","swing"], typicalKeys:["F","Bb","Eb","Ab","Db"], instruments:["sax","piano","bass","drums","trumpet"] },
  electronic: { name:"Electronic", bpmRange:[120,150], energy:"high", complexity:"medium", characteristics:["synthetic","repetitive","dance"], typicalKeys:["C","A","F","G","D"], instruments:["synth","drum machine","sampler","bass"] },
  hiphop: { name:"Hip-Hop", bpmRange:[70,100], energy:"medium", complexity:"medium", characteristics:["beat","bass","rap","groove"], typicalKeys:["A","E","D","G","C"], instruments:["drums","bass","sampler","vocals"] },
  classical: { name:"Classical", bpmRange:[60,140], energy:"low", complexity:"high", characteristics:["orchestral","dynamic","expressive"], typicalKeys:["C","G","D","F","Bb"], instruments:["strings","woodwinds","brass","percussion"] },
  blues: { name:"Blues", bpmRange:[60,120], energy:"medium", complexity:"low", characteristics:["12-bar","guitar","soulful"], typicalKeys:["E","A","D","G","C"], instruments:["guitar","harmonica","piano","bass","drums"] },
  folk: { name:"Folk", bpmRange:[80,120], energy:"low", complexity:"low", characteristics:["acoustic","storytelling","organic"], typicalKeys:["G","D","A","C","E"], instruments:["acoustic guitar","banjo","fiddle","vocals"] }
};

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_genre_profiles", description:"Get all genre profiles", category:"genres", parameters:{} },
    async () => ({ success:true, data:{ genres:GENRE_PROFILES } })
  );

  
  
  
  return reg;
}
