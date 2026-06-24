// Módulo: Acordes & Progresiones — reutilizado de examples/chord-progression-generator
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

const CHORDS: any = {
  major: { "C":[60,64,67], "C#":[61,65,69], "D":[62,66,69], "Eb":[63,67,70], "E":[64,68,71], "F":[65,69,72], "F#":[66,70,73], "G":[67,71,74], "Ab":[68,72,75], "A":[69,73,76], "Bb":[70,74,77], "B":[71,75,78] },
  minor: { "C":[60,63,67], "C#":[61,64,68], "D":[62,65,69], "Eb":[63,66,70], "E":[64,67,71], "F":[65,68,72], "F#":[66,69,73], "G":[67,70,74], "Ab":[68,71,75], "A":[69,72,76], "Bb":[70,73,77], "B":[71,74,78] }
};

const PROGRESSIONS: any = {
  pop:    { major:["I","V","vi","IV"], minor:["i","III","VII","iv"] },
  rock:   { major:["I","IV","v","I"], minor:["i","iv","VII","III"] },
  jazz:   { major:["ii","V","I","vi"], minor:["iiø","V","i","IV"] },
  blues:  { major:["I","IV","I","V","IV","I"], minor:["i","iv","i","V","iv","i"] },
  epic:   { major:["I","V","vi","IV","I","V","vi","IV"], minor:["i","III","VII","iv"] },
  ambient: { major:["I","iii","IV","V","I"], minor:["i","VII","VI","v","i"] }
};

// Roman-numeral → 0-based scale degree (quality is taken from the diatonic scale below).
const SCALE_DEGREES: any = { I:0, i:0, II:1, ii:1, "iiø":1, iii:2, III:2, IV:3, iv:3, V:4, v:4, vi:5, VI:5, vii:6, VII:6 };
const SCALE_SEMIS: any = { major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10] };

// A diatonic triad on `degree` of the scale, stacking thirds (degree, +2, +4 scale steps).
function diatonicTriad(rootMidi: number, scale: string, degree: number): number[] {
  const semis = SCALE_SEMIS[scale] || SCALE_SEMIS.major;
  return [degree, degree + 2, degree + 4].map((s) => rootMidi + semis[((s % 7) + 7) % 7] + 12 * Math.floor(s / 7));
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_progressions", description:"Get available progressions by genre", category:"chords", parameters:{ genre:{type:"string",description:"Genre",required:false,enum:["pop","rock","jazz","blues","epic","ambient"]} } },
    async (args: any) => {
      const genre = args.genre;
      if (genre) { const p = PROGRESSIONS[genre]; return { success:true, data:{ genre, progressions:{ major:p.major, minor:p.minor } } }; }
      return { success:true, data:PROGRESSIONS };
    }
  );

  reg.register({ name:"generate_chords", description:"Generate chord progression MIDI", category:"chords", parameters:{ key:{type:"string",description:"Key",required:true}, scale:{type:"string",description:"Major/minor",required:true,enum:["major","minor"]}, genre:{type:"string",description:"Genre",required:true,enum:["pop","rock","jazz","blues","epic","ambient"]}, track_index:{type:"number",description:"Track index",required:false} } },
    async (args: any, song: any) => {
      const key = args.key; const scale = args.scale; const genre = args.genre;
      const progression = PROGRESSIONS[genre][scale] || PROGRESSIONS.pop[scale];
      const chordSet = CHORDS[scale];
      if (!chordSet[key]) return { success:false, error:`Unknown key: ${key}` };
      const trackIdx = args.track_index;
      const track = trackIdx !== undefined ? song.tracks[trackIdx] : await song.createMidiTrack();
      if (trackIdx === undefined) { track.name = `Chords ${key} ${genre}`; }
      const duration = 4;
      const clip = await track.createMidiClip(0, progression.length * 4);
      clip.name = `${key} ${genre}`;
      const rootMidi = chordSet[key][0]; // tonic root for this key
      // Build every chord-tone first, then write the whole array once. The real MidiClip
      // setter REPLACES the note list; writing note-by-note (read-modify-write) only kept
      // the last note in Live, which is the "single note" the tester saw.
      const notes: any[] = [];
      progression.forEach((sym: string, i: number) => {
        const degree = SCALE_DEGREES[sym] ?? 0;
        for (const pitch of diatonicTriad(rootMidi, scale, degree)) {
          notes.push({ pitch, startTime: i * duration, duration, velocity: 100 });
        }
      });
      clip.notes = notes;
      return { success:true, data:{ key, scale, genre, progression, trackIndex:song.tracks.indexOf(track), clipName:clip.name, notes:notes.length } };
    }
  );

  reg.register({ name:"get_keys", description:"Get available musical keys", category:"chords", parameters:{} },
    async () => ({ success:true, data:{ major:Object.keys(CHORDS.major), minor:Object.keys(CHORDS.minor) } })
  );

  reg.register({ name:"voice_lead", description:"Apply voice leading to chord progression", category:"chords", parameters:{ track_index:{type:"number",description:"Track index",required:true}, strategy:{type:"string",description:"Strategy",required:false,enum:["close","open","drop2"]} } },
    async (args: any) => ({ success:true, data:{ applied:true, strategy:args.strategy||"close", trackIndex:args.track_index } })
  );

  return reg;
}
