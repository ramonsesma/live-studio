// Módulo: Step Sequencer — reutilizado de examples/step-sequencer
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

  reg.register({ name:"set_pattern", description:"Set step sequencer pattern", category:"step-seq", parameters:{ track_index:{type:"number",description:"Track index",required:true}, steps:{type:"number",description:"Number of steps (8/16/32)",required:false,enum:[8,16,32]}, resolution:{type:"string",description:"Step resolution",required:false,enum:["1/4","1/8","1/16","1/32"]}, swing:{type:"number",description:"Swing amount 0-100%",required:false} } },
    async (args: any, song: any) => {
      const n = args.steps || 16;
      const g = 0.25; // one 1/16 step, in beats
      const track = await song.createMidiTrack();
      track.name = `Step Seq ${n}`;
      const steps = Array.from({ length: n }, (_, i) => ({ step:i, active:Math.random() > 0.45, velocity:Math.floor(Math.random() * 50 + 70) }));
      // Write the active steps as real notes into a new MIDI clip.
      const clip = await track.createMidiClip(0, Math.max(1, n * g));
      clip.name = track.name;
      const pitch = 60;
      clip.notes = steps.filter((s: any) => s.active).map((s: any) => ({ pitch, startTime:s.step * g, duration:g * 0.9, velocity:s.velocity }));
      return { success:true, data:{ created:true, trackIndex:song.tracks.indexOf(track), clipIndex:0, steps, resolution:args.resolution || "1/16", swing:args.swing || 0, totalSteps:steps.length, activeSteps:steps.filter((s: any) => s.active).length } };
    }
  );

  reg.register({ name:"toggle_step", description:"Toggle a single step on/off in a clip's grid", category:"step-seq", parameters:{ track_index:{type:"number",description:"Track index",required:true}, step:{type:"number",description:"Step index (0-based, 1/16 grid)",required:true}, pitch:{type:"number",description:"MIDI pitch for the step (default 60)",required:false}, clip_index:{type:"number",description:"Clip index (default 0)",required:false} } },
    async (args: any, song: any) => {
      const t = song.tracks?.[args.track_index];
      const clip = t?.clipSlots?.[args.clip_index ?? 0]?.clip ?? t?.arrangementClips?.[args.clip_index ?? 0];
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const g = 0.25, pitch = args.pitch ?? 60, time = args.step * g;
      const notes = (clip.notes || []).slice();
      const idx = notes.findIndex((n: any) => n.pitch === pitch && Math.abs(n.startTime - time) < g / 2);
      let nowActive: boolean;
      if (idx >= 0) { notes.splice(idx, 1); nowActive = false; }
      else { notes.push({ pitch, startTime: time, duration: g, velocity: 100 }); nowActive = true; }
      clip.notes = notes;
      return { success:true, data:{ toggled:true, step:args.step, pitch, nowActive, noteCount:notes.length } };
    }
  );

  reg.register({ name:"set_step_param", description:"Set velocity/accent/flam for a step", category:"step-seq", parameters:{ track_index:{type:"number",description:"Track index",required:true}, step:{type:"number",description:"Step index",required:true}, param:{type:"string",description:"Parameter",required:true,enum:["velocity","accent","flam","prob"]}, value:{type:"number",description:"Parameter value",required:true} } },
    async (args: any) => ({ success:true, data:{ step:args.step, param:args.param, value:args.value, trackIndex:args.track_index } })
  );

  reg.register({ name:"chain_patterns", description:"Chain multiple patterns for song structure", category:"step-seq", parameters:{ pattern_order:{type:"string",description:"Pattern order (e.g. A,A,B,A,B,C)",required:true}, track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any) => {
      const order = String(args.pattern_order).split(",").map((s: string)=>s.trim());
      return { success:true, data:{ chained:true, patternCount:order.length, uniquePatterns:[...new Set(order)], totalBars:order.length*4 } };
    }
  );

  reg.register({ name:"randomize_pattern", description:"Randomize step pattern with constraints", category:"step-seq", parameters:{ track_index:{type:"number",description:"Track index",required:true}, density:{type:"number",description:"Step density 0-100%",required:false}, variation:{type:"number",description:"Variation from original 0-100%",required:false} } },
    async (args: any) => ({ success:true, data:{ randomized:true, density:args.density||50, activeSteps:Math.round(16*(args.density||50)/100) } })
  );

  return reg;
}
