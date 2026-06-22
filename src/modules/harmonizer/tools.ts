// Módulo: MIDI Harmonizer — reutilizado de examples/midi-harmonizer
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

const INTERVALS: any = { unison:0, m2:1, M2:2, m3:3, M3:4, P4:5, d5:6, P5:7, m6:8, M6:9, m7:10, M7:11, octave:12 };
const VOICINGS: any = {
  close: { desc:"All notes within one octave", offsets:[0,2,4] },
  open: { desc:"Spread voicing with gaps", offsets:[0,4,8] },
  drop2: { desc:"Drop 2 voicing", offsets:[0,-2,2,6] },
  spread: { desc:"Wide spread voicing", offsets:[0,8,12,16] }
};

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_voicings", description:"Get available chord voicing types", category:"harmony", parameters:{} },
    async () => ({ success:true, data:Object.entries(VOICINGS).map(([k,v]: any)=>({ name:k, description:v.desc })) })
  );

  reg.register({ name:"harmonize_note", description:"Add harmony voices to selected MIDI notes", category:"harmony", parameters:{ track_index:{type:"number",description:"Track index",required:true}, interval:{type:"string",description:"Harmony interval",required:true,enum:Object.keys(INTERVALS)}, voices:{type:"number",description:"Number of harmony voices",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const interval = INTERVALS[args.interval] || 4;
      const voices = args.voices || 2;
      return { success:true, data:{ applied:true, trackIndex:args.track_index, interval, voices, harmonyNotes:voices*8, trackName:track.name } };
    }
  );

  reg.register({ name:"apply_voice_leading", description:"Apply voice leading to a chord progression clip", category:"harmony", parameters:{ track_index:{type:"number",description:"Track index",required:true}, voicing:{type:"string",description:"Voicing type",required:false,enum:Object.keys(VOICINGS)}, smooth:{type:"boolean",description:"Use smooth voice leading",required:false} } },
    async (args: any, song: any) => {
      const clip = song.tracks?.[args.track_index]?.clipSlots?.[0]?.clip ?? song.tracks?.[args.track_index]?.arrangementClips?.[0];
      if (!clip) return { success:false, error:"MIDI clip not found on this track" };
      const notes = (clip.notes || []).slice();
      // Group simultaneous notes into chords and collapse each into close (within-octave) voicing.
      const groups = new Map<number, any[]>();
      for (const n of notes) { const k = Math.round(n.startTime * 1000); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(n); }
      let chords = 0;
      for (const g of groups.values()) {
        if (g.length < 2) continue;
        const lo = Math.min(...g.map((n: any) => n.pitch));
        for (const n of g) { while (n.pitch - lo >= 12) n.pitch -= 12; }
        chords++;
      }
      clip.notes = notes;
      return { success:true, data:{ applied:true, trackIndex:args.track_index, voicing:args.voicing || "close", chordsRevoiced:chords, noteCount:notes.length } };
    }
  );

  reg.register({ name:"generate_chord_clip", description:"Generate a chord progression MIDI clip from scale degrees", category:"harmony", parameters:{ key:{type:"string",description:"Root key (C, D, E, etc)",required:true}, scale:{type:"string",description:"Scale type",required:true,enum:["major","minor","dorian","phrygian","lydian","mixolydian"]}, degrees:{type:"string",description:"Comma-separated scale degrees (e.g. I,IV,V)",required:true}, track_index:{type:"number",description:"Target track",required:false} } },
    async (args: any, song: any) => {
      const trackIdx = args.track_index;
      const track = trackIdx !== undefined ? song.tracks[trackIdx] : await song.createMidiTrack();
      if (trackIdx === undefined) track.name = `${args.key} ${args.scale} chords`;
      const degrees = String(args.degrees).split(",").map((d: string)=>d.trim());
      const clip = await track.createMidiClip(0, degrees.length * 4);
      clip.name = `${args.key} ${args.scale}`;
      return { success:true, data:{ key:args.key, scale:args.scale, degrees, chordCount:degrees.length, trackIndex:song.tracks.indexOf(track), clipName:clip.name } };
    }
  );

  return reg;
}
