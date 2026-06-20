// Módulo: Vocal Tuner — reutilizado de examples/vocal-tuner
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

  reg.register({ name:"analyze_pitch", description:"Analyze pitch of audio clip or track", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (omit for live input)",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const notes = ["C3","D3","E3","F3","G3","A3","B3","C4","D4","E4","F4","G4","A4","B4","C5"];
      const detected = Array.from({length:10}, () => ({ note:notes[Math.floor(Math.random()*notes.length)], confidence:(Math.random()*0.3+0.7).toFixed(2), start:Math.random()*8, duration:Math.random()*2+0.5 }));
      return { success:true, data:{ trackName:track.name, noteCount:detected.length, detectedNotes:detected, averageConfidence:0.85 } };
    }
  );

  reg.register({ name:"apply_correction", description:"Apply pitch correction to clip", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, strength:{type:"number",description:"Correction strength 0-100",required:false}, scale:{type:"string",description:"Musical scale to snap to",required:false}, formant:{type:"number",description:"Formant shift 0-100",required:false} } },
    async (args: any) => ({ success:true, data:{ applied:true, trackIndex:args.track_index, clipIndex:args.clip_index, strength:args.strength||70, scale:args.scale||"chromatic", formant:args.formant||50, correctedNotes:Math.floor(Math.random()*30)+10 } })
  );

  reg.register({ name:"set_tuning", description:"Set vocal tuning parameters", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, retune_speed:{type:"number",description:"Retune speed ms",required:false}, vibrato_depth:{type:"number",description:"Vibrato depth 0-100",required:false}, vibrato_rate:{type:"number",description:"Vibrato rate Hz",required:false} } },
    async (args: any) => ({ success:true, data:{ configured:true, trackIndex:args.track_index, retuneSpeed:args.retune_speed||20, vibratoDepth:args.vibrato_depth||30, vibratoRate:args.vibrato_rate||5 } })
  );

  reg.register({ name:"detect_scale", description:"Detect the musical scale from a vocal clip", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async () => {
      const scales = ["C major","G major","D minor","A minor","E minor","F major","Bb major","C minor"];
      return { success:true, data:{ detectedScale:scales[Math.floor(Math.random()*scales.length)], confidence:(Math.random()*0.3+0.65).toFixed(2), key:"C", mode:"major" } };
    }
  );

  return reg;
}
