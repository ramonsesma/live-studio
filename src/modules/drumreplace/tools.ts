// Módulo: Drum Replacer — reutilizado de examples/drum-replacer
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

const DRUM_KITS: any[] = [
  { name:"Acoustic Kit", samples:["Kick","Snare","Hi-Hat","Tom","Crash","Ride"] },
  { name:"Electronic Kit", samples:["808 Kick","909 Snare","Clap","Hi-Hat","Open Hat","Rim"] },
  { name:"Processed Kit", samples:["Thump","Crack","Sizzle","Boom","Punch","Tone"] }
];

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"analyze_drums", description:"Analyze drum track and detect hits", category:"drum-replace", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const hits = [
        { type:"Kick", hits:32, averageVelocity:95, confidence:0.94 },
        { type:"Snare", hits:24, averageVelocity:82, confidence:0.88 },
        { type:"Hi-Hat", hits:64, averageVelocity:70, confidence:0.76 },
        { type:"Tom", hits:8, averageVelocity:78, confidence:0.65 }
      ];
      return { success:true, data:{ trackName:track.name, totalHits:hits.reduce((s,h)=>s+h.hits,0), hitAnalysis:hits } };
    }
  );

  reg.register({ name:"replace_drum", description:"Replace a drum type with a sample", category:"drum-replace", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, drum_type:{type:"string",description:"Drum type to replace",required:true,enum:["kick","snare","hi-hat","tom","all"]}, sample_index:{type:"number",description:"Sample kit index",required:false}, blend:{type:"number",description:"Blend with original 0-100%",required:false} } },
    async (args: any, song: any) => {
      const midiTrack = await song.createMidiTrack();
      midiTrack.name = `Replaced: ${args.drum_type}`;
      return { success:true, data:{ replaced:true, drumType:args.drum_type, sampleKit:DRUM_KITS[args.sample_index||0].name, blend:args.blend||50, midiTrackIndex:song.tracks.indexOf(midiTrack), hitCount:Math.floor(Math.random()*40)+20 } };
    }
  );

  reg.register({ name:"get_kits", description:"List available drum replacement kits", category:"drum-replace", parameters:{} },
    async () => ({ success:true, data:{ kits:DRUM_KITS } })
  );

  reg.register({ name:"create_layer", description:"Layer a sample under the original drum", category:"drum-replace", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, drum_type:{type:"string",description:"Drum type",required:true,enum:["kick","snare","hi-hat","tom"]}, level:{type:"number",description:"Layer level dB",required:false} } },
    async (args: any) => ({ success:true, data:{ layered:true, drumType:args.drum_type, level:args.level||-6, sample:`Tight_${args.drum_type}.wav`, latency:"0.5ms" } })
  );

  return reg;
}
