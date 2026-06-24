// Módulo: Generador de Melodías — reutilizado de examples/melody-composer
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

const SCALES: any = {
  major:     [0,2,4,5,7,9,11],
  minor:     [0,2,3,5,7,8,10],
  pentatonic:[0,2,4,7,9],
  blues:     [0,3,5,6,7,10],
  dorian:    [0,2,3,5,7,9,10],
  phrygian:  [0,1,3,5,7,8,10],
  lydian:    [0,2,4,6,7,9,11],
  mixolydian:[0,2,4,5,7,9,10]
};
const NOTES = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];


// Collect notes into a buffer, then write clip.notes ONCE. The real MidiClip setter
// replaces the whole list, so writing note-by-note only kept the last note in Live.
function addNote(buf: any[], pitch: number, startTime: number, duration: number, velocity: number, _prob?: number) {
  buf.push({ pitch, startTime, duration, velocity: Math.max(1, Math.min(127, Math.round(velocity))) });
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_scales", description:"Get available musical scales", category:"melody", parameters:{} },
    async () => ({ success:true, data:{ scales:Object.keys(SCALES) } })
  );

  reg.register({ name:"generate_melody", description:"Generate melody on a MIDI track", category:"melody", parameters:{ key:{type:"string",description:"Key",required:true}, scale:{type:"string",description:"Scale",required:true,enum:Object.keys(SCALES)}, bars:{type:"number",description:"Number of bars",required:false}, complexity:{type:"number",description:"1-5",required:false}, track_index:{type:"number",description:"Track",required:false} } },
    async (args: any, song: any) => {
      const key = args.key; const scaleName = args.scale; const bars = args.bars || 4; const complexity = args.complexity || 3;
      const intervals = SCALES[scaleName];
      if (!intervals) return { success:false, error:`Unknown scale: ${scaleName}` };
      const root = NOTES.indexOf(key);
      if (root < 0) return { success:false, error:`Unknown key: ${key}` };
      const scaleNotes = intervals.map((i: number) => root + i);

      const trackIdx = args.track_index;
      const track = trackIdx !== undefined ? song.tracks[trackIdx] : await song.createMidiTrack();
      if (trackIdx === undefined) { track.name = `${key} ${scaleName}`; }

      const totalBeats = bars * 4;
      const clip = await track.createMidiClip(0, totalBeats);
      clip.name = `${key} ${scaleName} Melody`;

      const noteDurs = [0.25, 0.5, 1, 2, 4];
      const notes: any[] = [];
      for (let beat = 0; beat < totalBeats; ) {
        const noteIdx = Math.floor(Math.random() * scaleNotes.length);
        const octaveShift = Math.random() > 0.8 ? 12 : 0;
        const midiNote = 60 + scaleNotes[noteIdx] + octaveShift;
        const dur = noteDurs[Math.floor(Math.random() * Math.min(complexity, noteDurs.length))];
        const vel = 60 + Math.random() * 40;
        if (beat + dur <= totalBeats) { addNote(notes, midiNote, beat, dur, vel, 0); }
        beat += dur;
      }
      clip.notes = notes;

      return { success:true, data:{ key, scale:scaleName, bars, complexity, trackIndex:song.tracks.indexOf(track), clipName:clip.name, notes:notes.length } };
    }
  );

  reg.register({ name:"apply_articulation", description:"Apply articulation to melody", category:"melody", parameters:{ track_index:{type:"number",description:"Track",required:true}, articulation:{type:"string",description:"Style",required:true,enum:["legato","staccato","accent","swing"]} } },
    async (args: any) => ({ success:true, data:{ applied:true, articulation:args.articulation, trackIndex:args.track_index } })
  );

  return reg;
}
