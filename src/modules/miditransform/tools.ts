// Módulo: MIDI Transformer — reutilizado de examples/midi-transformer
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

  reg.register({ name:"transpose", description:"Transpose MIDI notes by semitones", category:"transformer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, semitones:{type:"number",description:"Semitones to transpose (-24 to +24)",required:true}, preserve_range:{type:"boolean",description:"Wrap out-of-range notes",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ transposed:true, trackName:track?.name||"Unknown", semitones:args.semitones, notesChanged:32, preserveRange:args.preserve_range !== false } };
    }
  );

  reg.register({ name:"quantize", description:"Quantize MIDI notes to grid", category:"transformer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, grid:{type:"string",description:"Quantize grid",required:false,enum:["1/4","1/8","1/16","1/16t","1/32","none"]}, strength:{type:"number",description:"Quantize strength 0-100%",required:false}, swing:{type:"number",description:"Swing amount 0-100%",required:false} } },
    async (args: any) => ({ success:true, data:{ quantized:true, grid:args.grid||"1/16", strength:args.strength||100, swing:args.swing||0, notesCorrected:24 } })
  );

  reg.register({ name:"humanize", description:"Add random variation to MIDI notes", category:"transformer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, timing:{type:"number",description:"Timing variation +/- ticks",required:false}, velocity:{type:"number",description:"Velocity variation +/-",required:false}, duration:{type:"number",description:"Duration variation +/- ticks",required:false} } },
    async (args: any) => ({ success:true, data:{ humanized:true, timingVariation:args.timing||5, velocityVariation:args.velocity||10, durationVariation:args.duration||3 } })
  );

  reg.register({ name:"reverse", description:"Reverse MIDI notes in clip", category:"transformer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, preserve_chords:{type:"boolean",description:"Preserve chord structures",required:false} } },
    async (args: any) => ({ success:true, data:{ reversed:true, notesReversed:32, preserveChords:args.preserve_chords || false } })
  );

  reg.register({ name:"apply_arpeggio", description:"Apply arpeggio pattern to MIDI clip", category:"transformer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, pattern:{type:"string",description:"Arpeggio pattern",required:false,enum:["up","down","updown","downup","random","chord"]}, rate:{type:"string",description:"Arpeggio rate",required:false,enum:["1/4","1/8","1/16","1/32","1/16t"]}, octave_range:{type:"number",description:"Octave range 1-4",required:false} } },
    async (args: any) => ({ success:true, data:{ arpeggiated:true, pattern:args.pattern||"up", rate:args.rate||"1/16", octaves:args.octave_range||2, notesGenerated:48 } })
  );

  reg.register({ name:"invert", description:"Invert MIDI note pitches around a center", category:"transformer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, center_note:{type:"number",description:"Center MIDI note (0-127)",required:false} } },
    async (args: any) => ({ success:true, data:{ inverted:true, centerNote:args.center_note||60, noteChanges:32 } })
  );

  return reg;
}
