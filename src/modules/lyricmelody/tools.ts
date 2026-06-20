// Módulo: Letra → Melodía — reutilizado de examples/lyric-to-melody
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

const NOTES = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];

function analyzeLyrics(text: string) {
  const words = text.toLowerCase().split(/[\s,.-]+/).filter((w: string) => w.length > 0);
  const syllables = words.map((w: string) => ({ word:w, syllables:Math.max(1, Math.ceil(w.length / 3)) }));
  const totalSyllables = syllables.reduce((sum: number, s: any) => sum + s.syllables, 0);
  const stress = words.map((w: string) => {
    const last = w.length > 2 ? ["ed","ly","ing","er","est","tion","sion","ment","ness","less"] : [];
    const stressed = last.some((s: string) => w.endsWith(s)) || w.length > 3;
    return stressed ? "strong" : "weak";
  });
  return { words, syllables, totalSyllables, stress };
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"analyze_lyrics", description:"Analyze lyrics for melody generation", category:"lyrics", parameters:{ text:{type:"string",description:"Lyric text",required:true} } },
    async (args: any) => {
      const analysis = analyzeLyrics(args.text);
      return { success:true, data:{ ...analysis, wordCount:analysis.words.length, syllableCount:analysis.totalSyllables } };
    }
  );

  reg.register({ name:"generate_melody_from_lyrics", description:"Generate melody from lyrics", category:"melody", parameters:{ text:{type:"string",description:"Lyric text",required:true}, key:{type:"string",description:"Key",required:false}, scale:{type:"string",description:"Scale",required:false,enum:["major","minor","pentatonic","blues"]}, track_index:{type:"number",description:"Track",required:false} } },
    async (args: any, song: any) => {
      const analysis = analyzeLyrics(args.text);
      const key = args.key || "C";
      const scaleName = args.scale || "major";
      const root = NOTES.indexOf(key);
      const scaleIntervals = scaleName === "major" ? [0,2,4,5,7,9,11] : scaleName === "minor" ? [0,2,3,5,7,8,10] : [0,2,4,7,9];
      const scaleNotes = scaleIntervals.map((i: number) => root + i);
      const trackIdx = args.track_index;
      const track = trackIdx !== undefined ? song.tracks[trackIdx] : await song.createMidiTrack();
      if (trackIdx === undefined) { track.name = `LyricMelody ${key}`; }
      const totalBeats = analysis.totalSyllables * 0.5;
      const clip = await track.createMidiClip(0, Math.max(totalBeats, 4));
      clip.name = `${key} LyricMelody`;
      let beat = 0;
      for (let i = 0; i < analysis.words.length; i++) {
        const noteIdx = i % scaleNotes.length;
        const octave = Math.floor(i / scaleNotes.length);
        const midiNote = 60 + scaleNotes[noteIdx] + (octave * 12);
        const dur = analysis.stress[i] === "strong" ? 1 : 0.5;
        const vel = analysis.stress[i] === "strong" ? 100 : 70;
        if (beat + dur <= totalBeats) { await clip.addNote(midiNote, beat, dur, vel, 0); }
        beat += dur;
      }
      return { success:true, data:{ key, scale:scaleName, words:analysis.words, totalNotes:analysis.words.length, trackIndex:song.tracks.indexOf(track), clipName:clip.name, phraseCount:analysis.syllables.filter((s: any)=>s.syllables>2).length } };
    }
  );

  reg.register({ name:"suggest_harmony", description:"Suggest harmony for melody", category:"harmony", parameters:{ track_index:{type:"number",description:"Melody track",required:true}, style:{type:"string",description:"Harmony style",required:false,enum:["close","open","octave","third","fifth","cluster"]} } },
    async (args: any) => ({ success:true, data:{ suggested:true, style:args.style||"third", parts:2, intervals:[0,4,7], trackIndex:args.track_index } })
  );

  return reg;
}
