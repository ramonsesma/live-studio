// Módulo: MIDI Randomizer — reutilizado de examples/midi-randomizer
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

  reg.register({ name:"randomize_pitch", description:"Randomize MIDI note pitches with constraints", category:"randomizer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, min_pitch:{type:"number",description:"Minimum MIDI pitch (0-127)",required:false}, max_pitch:{type:"number",description:"Maximum MIDI pitch (0-127)",required:false}, scale:{type:"string",description:"Constrain to scale",required:false,enum:["chromatic","major","minor","pentatonic","blues","whole-tone"]}, probability:{type:"number",description:"Probability of change 0-100%",required:false}, seed:{type:"number",description:"Random seed for reproducibility",required:false} } },
    async (args: any) => ({ success:true, data:{ randomized:true, mode:"pitch", affected:Math.floor(Math.random()*40)+10, minPitch:args.min_pitch||36, maxPitch:args.max_pitch||96, scale:args.scale||"chromatic", probability:args.probability||80, seed:args.seed||Date.now() } })
  );

  reg.register({ name:"randomize_velocity", description:"Randomize MIDI note velocities", category:"randomizer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, min_velocity:{type:"number",description:"Minimum velocity 0-127",required:false}, max_velocity:{type:"number",description:"Maximum velocity 0-127",required:false}, curve:{type:"string",description:"Velocity distribution curve",required:false,enum:["uniform","gaussian","accent","humanize"]}, accent_rate:{type:"number",description:"Accent note rate 0-100%",required:false} } },
    async (args: any) => ({ success:true, data:{ randomized:true, mode:"velocity", affected:Math.floor(Math.random()*60)+20, minVelocity:args.min_velocity||30, maxVelocity:args.max_velocity||127, curve:args.curve||"humanize", accentRate:args.accent_rate||25 } })
  );

  reg.register({ name:"randomize_timing", description:"Randomize MIDI note timing/position", category:"randomizer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, amount:{type:"number",description:"Randomization amount in ticks",required:false}, grid:{type:"boolean",description:"Snap to grid after randomization",required:false} } },
    async (args: any) => ({ success:true, data:{ randomized:true, mode:"timing", affected:Math.floor(Math.random()*60)+20, amount:args.amount||10, grid:args.grid!==false } })
  );

  reg.register({ name:"randomize_duration", description:"Randomize MIDI note durations", category:"randomizer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, min_duration:{type:"number",description:"Minimum duration in beats",required:false}, max_duration:{type:"number",description:"Maximum duration in beats",required:false}, legacy_probability:{type:"number",description:"Probability of legato 0-100%",required:false} } },
    async (args: any) => ({ success:true, data:{ randomized:true, mode:"duration", affected:Math.floor(Math.random()*60)+20, minDuration:args.min_duration||0.25, maxDuration:args.max_duration||4, legacyProb:args.legacy_probability||30 } })
  );

  reg.register({ name:"randomize_all", description:"Randomize all note parameters at once", category:"randomizer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, pitch_amount:{type:"number",description:"Pitch randomization amount",required:false}, velocity_amount:{type:"number",description:"Velocity randomization amount",required:false}, timing_amount:{type:"number",description:"Timing randomization amount",required:false}, duration_amount:{type:"number",description:"Duration randomization amount",required:false} } },
    async (args: any) => ({ success:true, data:{ randomized:true, mode:"all", pitchAmount:args.pitch_amount||30, velocityAmount:args.velocity_amount||40, timingAmount:args.timing_amount||15, durationAmount:args.duration_amount||25 } })
  );

  return reg;
}
