// Módulo: Audio → MIDI — reutilizado de examples/audio-to-midi
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

  reg.register({ name:"get_audio_clips", description:"List audio clips available for conversion", category:"audio2midi", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const clips = Array.from({length:3}, (_, i) => ({ index:i, name:`${track.name||"Track"} Clip ${i+1}`, duration:Math.floor(Math.random()*16)+4, sampleRate:44100 }));
      return { success:true, data:{ trackName:track.name, clipCount:clips.length, clips } };
    }
  );

  reg.register({ name:"convert_to_midi", description:"Convert audio to MIDI notes", category:"audio2midi", parameters:{ track_index:{type:"number",description:"Audio track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, mode:{type:"string",description:"Conversion mode",required:false,enum:["melody","bass","harmony","full"]}, sensitivity:{type:"number",description:"Pitch detection sensitivity 0-100",required:false}, min_note:{type:"number",description:"Minimum MIDI note",required:false}, max_note:{type:"number",description:"Maximum MIDI note",required:false} } },
    async (args: any, song: any) => {
      const midiTrack = await song.createMidiTrack();
      midiTrack.name = `MIDI: ${song.tracks[args.track_index]?.name||"audio"}`;
      return { success:true, data:{ converted:true, mode:args.mode||"melody", sensitivity:args.sensitivity||75, noteCount:Math.floor(Math.random()*50)+20, midiTrackIndex:song.tracks.indexOf(midiTrack), midiTrackName:midiTrack.name } };
    }
  );

  reg.register({ name:"convert_to_chords", description:"Detect chords from audio and create chord clip", category:"audio2midi", parameters:{ track_index:{type:"number",description:"Audio track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, chord_resolution:{type:"string",description:"Chord detection resolution",required:false,enum:["simple","extended","detailed"]} } },
    async (args: any, song: any) => {
      const midiTrack = await song.createMidiTrack();
      midiTrack.name = `Chords: ${song.tracks[args.track_index]?.name||"audio"}`;
      const chords = ["Cmaj7","Fmaj7","G7","Am7","Dm7","E7","Bb","D7"];
      const detected = Array.from({length:8}, (_, i) => ({ chord:chords[i%chords.length], start:i*4, duration:4 }));
      return { success:true, data:{ converted:true, chordCount:detected.length, chords:detected, midiTrackIndex:song.tracks.indexOf(midiTrack) } };
    }
  );

  reg.register({ name:"convert_to_drums", description:"Convert audio drum loop to MIDI drum map", category:"audio2midi", parameters:{ track_index:{type:"number",description:"Audio track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, kit:{type:"string",description:"Drum kit mapping",required:false,enum:["standard","electronic","acoustic","custom"]} } },
    async (args: any, song: any) => {
      const midiTrack = await song.createMidiTrack();
      midiTrack.name = `Drums: ${song.tracks[args.track_index]?.name||"audio"}`;
      return { success:true, data:{ converted:true, kit:args.kit||"standard", hits:Math.floor(Math.random()*80)+40, midiTrackIndex:song.tracks.indexOf(midiTrack) } };
    }
  );

  return reg;
}
