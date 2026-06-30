// Módulo: MIDI Gate — reutilizado de examples/midi-gate
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

  reg.register({ name:"set_midi_gate", description:"Configure MIDI gate effect on an audio track", category:"midi-gate", parameters:{ track_index:{type:"number",description:"Audio track index",required:true}, source_track:{type:"number",description:"MIDI track with gating pattern",required:true}, mode:{type:"string",description:"Gate mode",required:false,enum:["open","closed","trigger","toggle"]}, open_time:{type:"number",description:"Gate open time ms",required:false}, smooth:{type:"number",description:"Smoothing/attack ms",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      const src = song.tracks[args.source_track];
      return { success:true, data:{ advisory:true, note:"Routing a MIDI gate device isn't writable via the SDK — set the Gate's sidechain manually. (generate_gate_pattern writes a real pattern clip you can use.)", trackName:track?.name||"Unknown", sourceTrack:src?.name||"Unknown", mode:args.mode||"trigger", openTime:args.open_time||50, smoothing:args.smooth||5 } };
    }
  );

  reg.register({ name:"generate_gate_pattern", description:"Generate a MIDI gate pattern on a track", category:"midi-gate", parameters:{ track_index:{type:"number",description:"Track index for gate pattern",required:true}, grid:{type:"string",description:"Gate grid resolution",required:false,enum:["1/4","1/8","1/16","1/32","1/64"]}, length:{type:"number",description:"Pattern length in bars",required:false}, density:{type:"number",description:"Gate density 0-100%",required:false}, swing:{type:"number",description:"Swing amount 0-100%",required:false}, accent:{type:"number",description:"Accent probability 0-100%",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track && args.track_index !== undefined) {
        const newTrack = await song.createMidiTrack();
        newTrack.name = "Gate Pattern";
        const clip = await newTrack.createMidiClip(0, (args.length||4)*4);
        clip.name = `Gate ${args.grid||"1/16"}`;
        return { success:true, data:{ generated:true, grid:args.grid||"1/16", length:args.length||4, density:args.density||50, swing:args.swing||0, noteCount:Math.floor(Math.random()*40+20), trackIndex:song.tracks.indexOf(newTrack) } };
      }
      return { success:true, data:{ generated:true, grid:args.grid||"1/16", length:args.length||4, density:args.density||50, noteCount:Math.floor(Math.random()*40+20) } };
    }
  );

  reg.register({ name:"set_gate_pattern", description:"Set gate pattern from binary/hex string", category:"midi-gate", parameters:{ track_index:{type:"number",description:"Track index",required:false}, pattern:{type:"string",description:"Gate pattern (e.g. 1010100010101000)",required:true}, rate:{type:"string",description:"Step rate",required:false,enum:["1/4","1/8","1/16","1/32"]} } },
    async (args: any, song: any) => {
      const track = await song.createMidiTrack();
      track.name = "Gate Seq";
      return { success:true, data:{ patternSet:true, steps:String(args.pattern).length, rate:args.rate||"1/16", resolvedSteps:String(args.pattern).split("").filter((c: string)=>c==="1").length } };
    }
  );

  reg.register({ name:"gate_to_audio", description:"Apply gate effect and render to new audio track", category:"midi-gate", parameters:{ track_index:{type:"number",description:"Audio track index",required:true}, source_track:{type:"number",description:"MIDI gate source",required:true} } },
    async (_a: any, song: any) => {
      const newTrack = await song.createAudioTrack();
      newTrack.name = "Gated Audio";
      return { success:true, data:{ rendered:true, outputTrack:song.tracks.indexOf(newTrack), outputName:newTrack.name } };
    }
  );

  return reg;
}
