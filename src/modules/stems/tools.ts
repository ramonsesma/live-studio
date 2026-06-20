// Módulo: Stem Splitter — reutilizado de examples/stem-splitter
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

  reg.register({ name:"get_track_audio", description:"Get audio track info for splitting", category:"stem", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      return { success:true, data:{ trackName:track.name, duration:"32 bars", channels:2, sampleRate:44100, estimatedSize:"45 MB" } };
    }
  );

  reg.register({ name:"split_stems", description:"Split audio into stems (vocals, drums, bass, other)", category:"stem", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, stems:{type:"string",description:"Stems to extract (comma-separated)",required:false} } },
    async (args: any, song: any) => {
      const stemTypes = ["vocals","drums","bass","other"];
      const requested = args.stems ? String(args.stems).split(",").map((s: string)=>s.trim()) : stemTypes;
      const created: any[] = [];
      for (const stem of requested) {
        const t = await song.createAudioTrack();
        t.name = `${stem.toUpperCase()}: ${song.tracks[args.track_index]?.name||"source"}`;
        created.push({ stem, trackIndex:song.tracks.indexOf(t), trackName:t.name });
      }
      return { success:true, data:{ sourceTrack:args.track_index, splits:created.length, stems:created } };
    }
  );

  reg.register({ name:"analyze_content", description:"Analyze audio content and suggest stem split points", category:"stem", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async () => {
      const analysis = [
        { stem:"vocals", confidence:0.89, frequencyRange:"200Hz-4kHz", characteristic:"Mid-range, harmonic" },
        { stem:"drums", confidence:0.92, frequencyRange:"50Hz-12kHz", characteristic:"Transient-heavy, wide" },
        { stem:"bass", confidence:0.85, frequencyRange:"40Hz-250Hz", characteristic:"Low-end, sustained" },
        { stem:"other", confidence:0.76, frequencyRange:"Full", characteristic:"Remaining content" }
      ];
      return { success:true, data:{ recommendedStems:analysis.filter(a=>a.confidence>0.7).map(a=>a.stem), analysis } };
    }
  );

  reg.register({ name:"adjust_isolation", description:"Adjust stem isolation parameters", category:"stem", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, stem:{type:"string",description:"Stem to adjust",required:true,enum:["vocals","drums","bass","other"]}, strength:{type:"number",description:"Isolation strength 0-100",required:false}, smoothing:{type:"number",description:"Smoothing amount 0-100",required:false} } },
    async (args: any) => ({ success:true, data:{ adjusted:true, stem:args.stem, strength:args.strength||80, smoothing:args.smoothing||50, quality:"good" } })
  );

  return reg;
}
