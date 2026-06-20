// Módulo: MIDI LFO — reutilizado de examples/midi-lfo
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

  reg.register({ name:"set_lfo_target", description:"Set MIDI LFO target parameter", category:"midi-lfo", parameters:{ track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true}, param_name:{type:"string",description:"Parameter to modulate",required:true}, depth:{type:"number",description:"Modulation depth 0-100%",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ targetSet:true, trackName:track?.name||"Unknown", param:args.param_name, depth:args.depth||50 } };
    }
  );

  reg.register({ name:"set_lfo_shape", description:"Set LFO waveform shape", category:"midi-lfo", parameters:{ wave:{type:"string",description:"Waveform",required:true,enum:["sine","triangle","saw","square","saw2","random","sample_and_hold","noise"]}, rate:{type:"number",description:"Rate in Hz (0.01-50) or synced",required:false}, sync:{type:"boolean",description:"Sync to tempo",required:false}, rate_sync:{type:"string",description:"Synced rate division",required:false,enum:["1/1","1/2","1/4","1/8","1/16","1/32","1/1t","1/2t","1/4t","1/8t","1/16t"]}, phase:{type:"number",description:"Phase offset 0-360",required:false}, pulse_width:{type:"number",description:"Pulse width 0-100% (for square/saw)",required:false} } },
    async (args: any) => ({ success:true, data:{ shapeSet:true, wave:args.wave, rate:args.rate||(args.sync?null:1), sync:args.sync||false, rateSync:args.rate_sync||null, phase:args.phase||0, pulseWidth:args.pulse_width||50 } })
  );

  reg.register({ name:"set_lfo_bipolar", description:"Set LFO output as bipolar or unipolar", category:"midi-lfo", parameters:{ bipolar:{type:"boolean",description:"Bipolar (+/-) vs unipolar (0+)",required:false} } },
    async (args: any) => ({ success:true, data:{ bipolarSet:true, bipolar:args.bipolar !== false } })
  );

  reg.register({ name:"toggle_lfo", description:"Enable/disable the LFO", category:"midi-lfo", parameters:{ enabled:{type:"boolean",description:"LFO enabled",required:false} } },
    async (args: any) => ({ success:true, data:{ enabled:args.enabled !== false, lfoActive:args.enabled !== false } })
  );

  reg.register({ name:"set_lfo_multi_target", description:"Set LFO to modulate multiple targets", category:"midi-lfo", parameters:{ track_index:{type:"number",description:"Track index",required:true}, targets:{type:"string",description:"Comma-separated param names",required:true}, depth:{type:"number",description:"Depth 0-100%",required:false} } },
    async (args: any) => {
      const targets = String(args.targets).split(",").map((s: string)=>s.trim());
      return { success:true, data:{ multiTargetSet:true, targetCount:targets.length, targets, depth:args.depth||50 } };
    }
  );

  return reg;
}
