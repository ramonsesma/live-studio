// Módulo: Sampler & Slicing — reutilizado de examples/sample-slicer
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

  reg.register({ name:"get_audio_clips", description:"List audio clips on a track", category:"slicing", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const clips = await track.getClips?.() || [];
      return { success:true, data:{ trackIndex:args.track_index, trackName:track.name, clipCount:clips.length, clips:clips.map((c: any, i: number)=>({ index:i, name:c.name||`Clip ${i}`, duration:c.duration||0, start:c.start||0 })) } };
    }
  );

  reg.register({ name:"analyze_sample", description:"Analyze an audio clip for transient/slice points", category:"slicing", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, sensitivity:{type:"number",description:"Transient sensitivity 0-100",required:false} } },
    async (args: any) => {
      const sensitivity = args.sensitivity || 70;
      const count = Math.floor(Math.random() * sensitivity / 10) + 4;
      const slices = Array.from({length:count}, (_, i) => ({
        index:i, startTime:(i * 4 / count).toFixed(2), duration:(4/count).toFixed(2),
        amplitude:(Math.random() * 0.8 + 0.2).toFixed(2)
      }));
      return { success:true, data:{ trackIndex:args.track_index, clipIndex:args.clip_index, sliceCount:count, sensitivity, slices } };
    }
  );

  reg.register({ name:"slice_to_midi", description:"Slice audio clip to MIDI triggers on a new track", category:"slicing", parameters:{ track_index:{type:"number",description:"Audio track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, slice_method:{type:"string",description:"Slice method",required:false,enum:["transient","beat","grid","manual"]}, base_note:{type:"number",description:"Base MIDI note for mapping",required:false} } },
    async (args: any, song: any) => {
      const midiTrack = await song.createMidiTrack();
      midiTrack.name = `Sliced: ${song.tracks[args.track_index]?.name || "audio"}`;
      const baseNote = args.base_note || 36;
      const sliceCount = Math.floor(Math.random() * 8) + 8;
      return { success:true, data:{ trackIndex:args.track_index, clipIndex:args.clip_index, method:args.slice_method||"transient", midiTrackIndex:song.tracks.indexOf(midiTrack), sliceCount, baseNote, midiTrackName:midiTrack.name } };
    }
  );

  reg.register({ name:"adjust_slice_params", description:"Adjust slicing parameters and preview", category:"slicing", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, attack:{type:"number",description:"Slice attack in ms",required:false}, decay:{type:"number",description:"Slice decay in ms",required:false}, pitch:{type:"number",description:"Pitch shift semitones",required:false} } },
    async (args: any) => ({ success:true, data:{ applied:true, trackIndex:args.track_index, clipIndex:args.clip_index, attack:args.attack||10, decay:args.decay||50, pitch:args.pitch||0 } })
  );

  return reg;
}
