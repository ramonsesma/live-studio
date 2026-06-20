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

  reg.register({ name:"classify_track", description:"Classify a track by genre", category:"classification", parameters:{ track_index:{type:"number",description:"Track to classify",required:true}, method:{type:"string",description:"Classification method",required:false,enum:["analysis","tempo","name","device"]} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:`Track ${args.track_index} not found` };
      const scores: any = {};
      for (const [genre, profile] of Object.entries(GENRE_PROFILES) as any) {
        let score = 50 + Math.random() * 50;
        if (track.name && profile.instruments.some((i: string) => track.name.toLowerCase().includes(i))) score += 20;
        scores[genre] = Math.min(score, 100);
      }
      const sorted = Object.entries(scores).sort(([,a]: any, [,b]: any) => b - a);
      return { success:true, data:{ trackIndex:args.track_index, trackName:track.name, primaryGenre:sorted[0][0], confidence:sorted[0][1], secondaryGenre:sorted[1][0], allScores:scores } };
    }
  );

  reg.register({ name:"classify_all_tracks", description:"Classify all tracks in session", category:"classification", parameters:{} },
    async (_a: any, song: any) => {
      const results = song.tracks.map((t: any, i: number) => {
        const scores: any = {};
        for (const [genre] of Object.entries(GENRE_PROFILES)) scores[genre] = 50 + Math.random() * 50;
        const sorted = Object.entries(scores).sort(([,a]: any, [,b]: any) => b - a);
        return { trackIndex:i, trackName:t.name, primaryGenre:sorted[0][0], confidence:sorted[0][1] };
      });
      return { success:true, data:{ tracks:results } };
    }
  );

  reg.register({ name:"get_track_recommendations", description:"Get genre-based track recommendations", category:"recommendations", parameters:{ track_index:{type:"number",description:"Track",required:true} } },
    async () => {
      const genres = Object.keys(GENRE_PROFILES);
      const recs = genres.map((g: string) => ({ genre:g, suggestion:`Try ${GENRE_PROFILES[g].instruments[0]} for a ${GENRE_PROFILES[g].name} feel`, confidence:Math.random()*100 }));
      return { success:true, data:{ recommendations:recs.sort((a: any,b: any)=>b.confidence-a.confidence).slice(0,3) } };
    }
  );

  return reg;
}
