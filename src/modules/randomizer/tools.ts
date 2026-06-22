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

// Real MIDI access: a Session clip lives at track.clipSlots[i].clip (fallback to
// arrangementClips). MidiClip.notes is a readable/writable NoteDescription[].
function getClip(song: any, ti: number, ci: number) {
  const t = song?.tracks?.[ti];
  return t?.clipSlots?.[ci ?? 0]?.clip ?? t?.arrangementClips?.[ci ?? 0] ?? null;
}
const SCALES: Record<string, number[]> = {
  chromatic:[0,1,2,3,4,5,6,7,8,9,10,11], major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10],
  pentatonic:[0,2,4,7,9], blues:[0,3,5,6,7,10], "whole-tone":[0,2,4,6,8,10],
};
function snapToScale(pitch: number, scale: number[], root: number) {
  const base = Math.floor((pitch - root) / 12) * 12 + root;
  const pc = ((pitch - root) % 12 + 12) % 12;
  let best = scale[0], bd = 99;
  for (const s of scale) { const d = Math.min((s - pc + 12) % 12, (pc - s + 12) % 12); if (d < bd) { bd = d; best = s; } }
  return Math.max(0, Math.min(127, base + best));
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"randomize_pitch", description:"Randomize MIDI note pitches with constraints", category:"randomizer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, min_pitch:{type:"number",description:"Minimum MIDI pitch (0-127)",required:false}, max_pitch:{type:"number",description:"Maximum MIDI pitch (0-127)",required:false}, scale:{type:"string",description:"Constrain to scale",required:false,enum:["chromatic","major","minor","pentatonic","blues","whole-tone"]}, probability:{type:"number",description:"Probability of change 0-100%",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const notes = (clip.notes || []).slice();
      const lo = args.min_pitch ?? 36, hi = args.max_pitch ?? 96, prob = (args.probability ?? 80) / 100;
      const scale = SCALES[args.scale || "chromatic"] || SCALES.chromatic;
      let affected = 0;
      for (const n of notes) { if (Math.random() > prob) continue; n.pitch = snapToScale(lo + Math.floor(Math.random() * (hi - lo + 1)), scale, song.rootNote || 0); affected++; }
      clip.notes = notes;
      return { success:true, data:{ randomized:true, mode:"pitch", affected, noteCount:notes.length, scale:args.scale||"chromatic" } };
    }
  );

  reg.register({ name:"randomize_velocity", description:"Randomize MIDI note velocities", category:"randomizer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, min_velocity:{type:"number",description:"Minimum velocity 0-127",required:false}, max_velocity:{type:"number",description:"Maximum velocity 0-127",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const notes = (clip.notes || []).slice();
      const lo = args.min_velocity ?? 30, hi = args.max_velocity ?? 127;
      for (const n of notes) n.velocity = Math.round(lo + Math.random() * (hi - lo));
      clip.notes = notes;
      return { success:true, data:{ randomized:true, mode:"velocity", affected:notes.length, minVelocity:lo, maxVelocity:hi } };
    }
  );

  reg.register({ name:"randomize_timing", description:"Randomize MIDI note timing/position", category:"randomizer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, amount:{type:"number",description:"Max shift in beats",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const notes = (clip.notes || []).slice();
      const amt = args.amount ?? 0.05;
      for (const n of notes) n.startTime = Math.max(0, n.startTime + (Math.random() * 2 - 1) * amt);
      clip.notes = notes;
      return { success:true, data:{ randomized:true, mode:"timing", affected:notes.length, amount:amt } };
    }
  );

  reg.register({ name:"randomize_duration", description:"Randomize MIDI note durations", category:"randomizer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, min_duration:{type:"number",description:"Minimum duration in beats",required:false}, max_duration:{type:"number",description:"Maximum duration in beats",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const notes = (clip.notes || []).slice();
      const lo = args.min_duration ?? 0.25, hi = args.max_duration ?? 2;
      for (const n of notes) n.duration = lo + Math.random() * (hi - lo);
      clip.notes = notes;
      return { success:true, data:{ randomized:true, mode:"duration", affected:notes.length, minDuration:lo, maxDuration:hi } };
    }
  );

  reg.register({ name:"randomize_all", description:"Randomize pitch, velocity, timing and duration at once", category:"randomizer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, timing_amount:{type:"number",description:"Timing shift in beats",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const notes = (clip.notes || []).slice();
      const amt = args.timing_amount ?? 0.05;
      for (const n of notes) {
        n.velocity = Math.round(40 + Math.random() * 87);
        n.startTime = Math.max(0, n.startTime + (Math.random() * 2 - 1) * amt);
        n.duration = 0.25 + Math.random() * 1.75;
      }
      clip.notes = notes;
      return { success:true, data:{ randomized:true, mode:"all", affected:notes.length } };
    }
  );

  return reg;
}
