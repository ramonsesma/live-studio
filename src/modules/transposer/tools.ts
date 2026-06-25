// Módulo: Range Auto-Transposer — tries the 25 semitone shifts (-12..+12) and picks the
// one that lands the most notes inside a target register (e.g. an instrument's playable
// range), tie-broken by the smallest move. Pure note.pitch edits, written in place.
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

function getClip(song: any, ti: number, ci: number) {
  const t = song?.tracks?.[ti]; if (!t) return { error: "Track not found" };
  const clip = t.clipSlots?.[ci]?.clip ?? t.arrangementClips?.[ci];
  if (!clip || !Array.isArray(clip.notes) || !clip.notes.length) return { error: "No MIDI clip with notes here." };
  return { track: t, clip };
}
function scoreShift(pitches: number[], shift: number, low: number, high: number) {
  let inRange = 0, dist = 0;
  for (const p of pitches) {
    const v = p + shift;
    if (v >= low && v <= high) inRange++;
    else dist += v < low ? low - v : v - high;
  }
  return { inRange, outside: pitches.length - inRange, dist };
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"suggest", description:"Rank the 25 transpositions (-12..+12) by how many notes land in [low,high]", category:"midi", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (default 0)",required:false}, low:{type:"number",description:"Lowest MIDI pitch of target range (default 48 = C3)",required:false}, high:{type:"number",description:"Highest MIDI pitch of target range (default 72 = C5)",required:false} } },
    async (args: any, song: any) => {
      const g = getClip(song, args.track_index, args.clip_index ?? 0); if (g.error) return { success:false, error:g.error };
      const low = args.low ?? 48, high = args.high ?? 72;
      const pitches = g.clip.notes.map((n: any) => n.pitch);
      const ranked = [];
      for (let s = -12; s <= 12; s++) ranked.push({ semitones: s, ...scoreShift(pitches, s, low, high) });
      ranked.sort((a, b) => b.inRange - a.inRange || a.dist - b.dist || Math.abs(a.semitones) - Math.abs(b.semitones));
      return { success:true, data:{ clip:g.clip.name, noteCount:pitches.length, targetRange:{ low, high }, best: ranked[0], ranked: ranked.slice(0, 8) } };
    }
  );

  reg.register({ name:"apply", description:"Transpose a clip's notes by N semitones (in place), clamped to 0..127", category:"midi", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (default 0)",required:false}, semitones:{type:"number",description:"Semitones to shift (use suggest.best)",required:true} } },
    async (args: any, song: any) => {
      const g = getClip(song, args.track_index, args.clip_index ?? 0); if (g.error) return { success:false, error:g.error };
      const s = Math.round(args.semitones || 0);
      g.clip.notes = g.clip.notes.map((n: any) => ({ ...n, pitch: Math.max(0, Math.min(127, n.pitch + s)) }));
      return { success:true, data:{ clip:g.clip.name, semitones:s, noteCount:g.clip.notes.length } };
    }
  );

  return reg;
}
