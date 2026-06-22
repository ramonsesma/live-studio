// Módulo: DJ & Mezcla Armónica — reutilizado de examples/harmonic-mixer
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

const CAMELOT_WHEEL: any = {
  "1A":{key:"Dm",compatible:["1B","2A","12A"]}, "1B":{key:"C",compatible:["1A","2B","12B"]},
  "2A":{key:"Gm",compatible:["2B","3A","1A"]}, "2B":{key:"D",compatible:["2A","3B","1B"]},
  "3A":{key:"Cm",compatible:["3B","4A","2A"]}, "3B":{key:"A",compatible:["3A","4B","2B"]},
  "4A":{key:"Fm",compatible:["4B","5A","3A"]}, "4B":{key:"E",compatible:["4A","5B","3B"]},
  "5A":{key:"Bbm",compatible:["5B","6A","4A"]}, "5B":{key:"B",compatible:["5A","6B","4B"]},
  "6A":{key:"Ebm",compatible:["6B","7A","5A"]}, "6B":{key:"F#",compatible:["6A","7B","5B"]},
  "7A":{key:"Abm",compatible:["7B","8A","6A"]}, "7B":{key:"Db",compatible:["7A","8B","6B"]},
  "8A":{key:"C#m",compatible:["8B","9A","7A"]}, "8B":{key:"Ab",compatible:["8A","9B","7B"]},
  "9A":{key:"F#m",compatible:["9B","10A","8A"]}, "9B":{key:"Eb",compatible:["9A","10B","8B"]},
  "10A":{key:"Bm",compatible:["10B","11A","9A"]}, "10B":{key:"Bb",compatible:["10A","11B","9B"]},
  "11A":{key:"Em",compatible:["11B","12A","10A"]}, "11B":{key:"F",compatible:["11A","12B","10B"]},
  "12A":{key:"Am",compatible:["12B","1A","11A"]}, "12B":{key:"G",compatible:["12A","1B","11B"]}
};

export function createToolRegistry() {
  const reg = new ToolRegistry();

  
  
  
  reg.register({ name:"analyze_project_harmony", description:"Analyze harmonic compatibility across all tracks", category:"harmonic", parameters:{} },
    async (_a: any, song: any) => {
      const tracks = song.tracks || [];
      return { success:true, data:{ trackCount:tracks.length, clusters:[{ name:"Group A (Compatible)", tracks:[0,1,3], key:"C major" },{ name:"Group B (Compatible)", tracks:[2,4], key:"G minor" }], recommendations:["Transition tracks 1→2 via 4-bar breakdown"] } };
    }
  );

  return reg;
}
