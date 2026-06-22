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

const GRID: Record<string, number> = { "1/4":1, "1/8":0.5, "1/16":0.25, "1/16t":1/6, "1/32":0.125 };
function getClip(song: any, ti: number, ci: number) {
  const t = song?.tracks?.[ti];
  return t?.clipSlots?.[ci ?? 0]?.clip ?? t?.arrangementClips?.[ci ?? 0] ?? null;
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"transpose", description:"Transpose MIDI notes by semitones", category:"transformer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, semitones:{type:"number",description:"Semitones to transpose (-24 to +24)",required:true}, preserve_range:{type:"boolean",description:"Wrap out-of-range notes back into 0-127",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const notes = (clip.notes || []).slice();
      for (const n of notes) { let p = n.pitch + args.semitones; if (args.preserve_range !== false) { while (p > 127) p -= 12; while (p < 0) p += 12; } n.pitch = Math.max(0, Math.min(127, p)); }
      clip.notes = notes;
      return { success:true, data:{ transposed:true, semitones:args.semitones, notesChanged:notes.length } };
    }
  );

  reg.register({ name:"quantize", description:"Quantize MIDI notes to grid", category:"transformer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, grid:{type:"string",description:"Quantize grid",required:false,enum:["1/4","1/8","1/16","1/16t","1/32"]}, strength:{type:"number",description:"Quantize strength 0-100%",required:false}, swing:{type:"number",description:"Swing amount 0-100%",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const g = GRID[args.grid || "1/16"] ?? 0.25, strength = (args.strength ?? 100) / 100, swing = (args.swing ?? 0) / 100;
      const notes = (clip.notes || []).slice();
      for (const n of notes) { const slot = Math.round(n.startTime / g); let t = n.startTime + (slot * g - n.startTime) * strength; if (swing > 0 && slot % 2 === 1) t += g * 0.5 * swing; n.startTime = Math.max(0, t); }
      clip.notes = notes;
      return { success:true, data:{ quantized:true, grid:args.grid || "1/16", notesCorrected:notes.length } };
    }
  );

  reg.register({ name:"humanize", description:"Add random variation to MIDI notes", category:"transformer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, timing:{type:"number",description:"Timing variation in beats",required:false}, velocity:{type:"number",description:"Velocity variation +/-",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const tv = args.timing ?? 0.03, vv = args.velocity ?? 12;
      const notes = (clip.notes || []).slice();
      for (const n of notes) { n.startTime = Math.max(0, n.startTime + (Math.random() * 2 - 1) * tv); n.velocity = Math.max(1, Math.min(127, Math.round((n.velocity ?? 100) + (Math.random() * 2 - 1) * vv))); }
      clip.notes = notes;
      return { success:true, data:{ humanized:true, notesChanged:notes.length } };
    }
  );

  reg.register({ name:"reverse", description:"Reverse MIDI notes in clip (mirror in time)", category:"transformer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const notes = (clip.notes || []).slice();
      const maxEnd = notes.length ? Math.max(clip.duration || 0, ...notes.map((n: any) => n.startTime + n.duration)) : 0;
      for (const n of notes) n.startTime = Math.max(0, maxEnd - (n.startTime + n.duration));
      clip.notes = notes;
      return { success:true, data:{ reversed:true, notesReversed:notes.length } };
    }
  );

  reg.register({ name:"invert", description:"Invert MIDI note pitches around a center", category:"transformer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, center_note:{type:"number",description:"Center MIDI note (0-127)",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const notes = (clip.notes || []).slice();
      const center = args.center_note ?? (notes.length ? Math.round(notes.reduce((a: number, n: any) => a + n.pitch, 0) / notes.length) : 60);
      for (const n of notes) n.pitch = Math.max(0, Math.min(127, 2 * center - n.pitch));
      clip.notes = notes;
      return { success:true, data:{ inverted:true, centerNote:center, noteChanges:notes.length } };
    }
  );

  reg.register({ name:"apply_arpeggio", description:"Turn the clip's pitches into an arpeggio pattern", category:"transformer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, pattern:{type:"string",description:"Arpeggio pattern",required:false,enum:["up","down","updown","random"]}, rate:{type:"string",description:"Arpeggio rate",required:false,enum:["1/4","1/8","1/16","1/32","1/16t"]}, octave_range:{type:"number",description:"Octave range 1-4",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const src = clip.notes || [];
      const pitches = ([...new Set(src.map((n: any) => n.pitch))] as number[]).sort((a, b) => a - b);
      if (!pitches.length) return { success:false, error:"Clip has no notes to arpeggiate" };
      const oct = Math.max(1, Math.min(4, args.octave_range ?? 1));
      let order: number[] = [];
      for (let o = 0; o < oct; o++) for (const p of pitches) order.push(p + o * 12);
      if (args.pattern === "down") order.reverse();
      else if (args.pattern === "updown") order = [...order, ...order.slice(1, -1).reverse()];
      else if (args.pattern === "random") order = order.sort(() => Math.random() - 0.5);
      const rate = GRID[args.rate || "1/16"] ?? 0.25;
      const span = clip.duration || 4;
      const out = [];
      for (let t = 0, i = 0; t < span; t += rate, i++) out.push({ pitch: Math.min(127, order[i % order.length]), startTime: t, duration: rate * 0.9, velocity: 100 });
      clip.notes = out;
      return { success:true, data:{ arpeggiated:true, pattern:args.pattern || "up", rate:args.rate || "1/16", notesGenerated:out.length } };
    }
  );

  return reg;
}
