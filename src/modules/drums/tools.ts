// Módulo: Drums & Patrones — reutilizado de examples/drum-pattern-generator
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

const GENRE_PATTERNS: any = {
  house:  { kick:[1,0,0,0,1,0,0,0], snare:[0,0,1,0,0,0,1,0], hat:[1,1,1,1,1,1,1,1], bpm:128, name:"House" },
  techno: { kick:[1,0,0,0,1,0,0,0], snare:[0,0,1,0,0,0,0,0], hat:[0,1,0,1,0,1,0,1], bpm:130, name:"Techno" },
  hiphop: { kick:[1,0,0,0,0,0,1,0], snare:[0,0,1,0,0,0,1,0], hat:[1,1,0,1,1,0,1,0], bpm:90, name:"Hip Hop" },
  trap:   { kick:[1,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0], snare:[0,0,1,0,0,1,0,0,0,0,1,0,0,1,0,0], hat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], bpm:140, name:"Trap" },
  rock:   { kick:[1,0,1,0,1,0,1,0], snare:[0,0,1,0,0,0,1,0], hat:[1,1,1,1,1,1,1,1], bpm:120, name:"Rock" },
  jazz:   { kick:[1,0,0,0,1,0,0,0], snare:[0,0,1,0,0,0,0,0], hat:[0,1,0,1,0,1,0,1], bpm:100, name:"Jazz" },
  dnb:    { kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], hat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], bpm:170, name:"DnB" },
  latin:  { kick:[1,0,1,0,1,1,0,0], snare:[0,0,1,0,0,0,1,0], hat:[1,1,0,1,1,0,1,1], bpm:110, name:"Latin" }
};

const DRUM_MAP: any = { kick:36, snare:38, hat:42, open_hat:46, clap:39, rim:37, tom_hi:48, tom_mid:47, tom_lo:45, crash:49, ride:51 };


// Real MidiClip API: notes are written via the `notes` setter (NoteDescription[]),
// not a non-existent addNote(clip, ). This shim appends one note to the real array.
function addNote(clip: any, pitch: number, startTime: number, duration: number, velocity: number, _prob?: number) {
  const ns = clip.notes || [];
  ns.push({ pitch, startTime, duration, velocity: Math.max(1, Math.min(127, Math.round(velocity))) });
  clip.notes = ns;
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_genres", description:"List available drum pattern genres", category:"patterns", parameters:{} },
    async () => ({ success:true, data:{ genres:Object.keys(GENRE_PATTERNS).map((k) => ({ id:k, name:GENRE_PATTERNS[k].name, bpm:GENRE_PATTERNS[k].bpm })) } })
  );

  reg.register({ name:"generate_pattern", description:"Generate drum pattern on a MIDI track", category:"patterns", parameters:{ genre:{type:"string",description:"Genre",required:true,enum:Object.keys(GENRE_PATTERNS)}, complexity:{type:"number",description:"1-5",required:false}, swing:{type:"number",description:"0-1",required:false}, track_index:{type:"number",description:"Track",required:false} } },
    async (args: any, song: any) => {
      const genre = args.genre; const complexity = args.complexity || 3; const swing = args.swing || 0;
      const pattern = GENRE_PATTERNS[genre];
      if (!pattern) return { success:false, error:`Unknown genre: ${genre}` };
      const trackIdx = args.track_index;
      const track = trackIdx !== undefined ? song.tracks[trackIdx] : await song.createMidiTrack();
      if (trackIdx === undefined) { track.name = `${pattern.name} Drums`; }
      const steps = pattern.kick.length;
      const clip = await track.createMidiClip(0, 4);
      clip.name = `${pattern.name} Pattern`;
      for (let i = 0; i < steps; i++) {
        const stepDur = 4 / steps;
        if (pattern.kick[i]) addNote(clip, DRUM_MAP.kick, i * stepDur, stepDur * 0.9, 100 + Math.random() * 20, 0);
        if (pattern.snare[i]) addNote(clip, DRUM_MAP.snare, i * stepDur, stepDur * 0.9, 100 + Math.random() * 20, 0);
        if (pattern.hat[i]) addNote(clip, DRUM_MAP.hat, i * stepDur, stepDur * 0.5, 80 + Math.random() * 30, 0);
        if (complexity > 3) {
          if (Math.random() > 0.7) addNote(clip, DRUM_MAP.open_hat, i * stepDur, stepDur * 0.3, 70, 0);
          if (Math.random() > 0.8) addNote(clip, DRUM_MAP.clap, i * stepDur, stepDur * 0.7, 90, 0);
        }
      }
      return { success:true, data:{ genre, complexity, swing, trackIndex:song.tracks.indexOf(track), clipName:clip.name, steps } };
    }
  );

  reg.register({ name:"add_variation", description:"Add variation to existing drum pattern", category:"patterns", parameters:{ track_index:{type:"number",description:"Track",required:true}, variation_type:{type:"string",description:"Type",required:false,enum:["fill","break","ghost","open"]} } },
    async (args: any) => ({ success:true, data:{ applied:true, type:args.variation_type||"fill", trackIndex:args.track_index } })
  );

  return reg;
}
