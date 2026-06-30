// Módulo: Clip Colorizer — colors a track's clips by a real metric (velocity / pitch / duration)
// writing actual clip.color values. Distinct from Color Theory (which applies harmonic palettes).
import { recordColor } from "../../core/history.js";
export class ToolRegistry {
  private handlers = new Map();
  definitions: any[] = [];
  register(def: any, handler: any) { this.definitions.push(def); this.handlers.set(def.name, handler); }
  async execute(name: string, args: any, song: any) {
    const handler = this.handlers.get(name);
    if (!handler) return { success: false, error: `Unknown: ${name}` };
    try { return await handler(args, song); }
    catch (err: any) { return { success: false, error: err.message || String(err) }; }
  }
  getDefinitionsJson() { return this.definitions; }
}

// Color ramps as packed RGB ints (the format clip.color expects).
const RAMPS: Record<string, number[]> = {
  heatmap: [0x4488ff, 0x00dddd, 0x44cc44, 0xffd700, 0xff8c00, 0xff4444],
  coolmap: [0xff4444, 0xff8c00, 0xffd700, 0x44cc44, 0x00dddd, 0x4488ff],
  pastel: [0xaecbfa, 0xb6e3c6, 0xfde3a7, 0xf6b8c1, 0xd7c0f0, 0xc0e0e0],
  monochrome: [0x303036, 0x505058, 0x707078, 0x9a9aa2, 0xc8c8cf, 0xf0f0f4],
};
const NEUTRAL = 0x888888;
function collectClips(track: any): any[] {
  const out: any[] = [];
  for (const slot of (track.clipSlots || [])) { if (slot?.clip) out.push(slot.clip); }
  for (const c of (track.arrangementClips || [])) { if (c) out.push(c); }
  return out;
}
function pick(ramp: number[], frac: number): number { return ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(frac * ramp.length)))]; }

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_track_clips", description:"List all clips on a MIDI/audio track", category:"clips", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const clips = collectClips(track).map((c: any, i: number) => {
        const notes = c.notes || [], pitches = notes.map((n: any) => n.pitch);
        return { index:i, name:c.name, start:c.startTime, duration:c.duration, color:c.color, noteCount:notes.length, velocityAvg: notes.length ? Math.round(notes.reduce((a: number, n: any) => a + (n.velocity ?? 100), 0) / notes.length) : null, pitchRange: pitches.length ? `${Math.min(...pitches)}-${Math.max(...pitches)}` : null };
      });
      return { success:true, data:{ trackIndex:args.track_index, trackName:track.name, clipCount:clips.length, clips } };
    }
  );

  reg.register({ name:"color_by_velocity", description:"Color a track's clips by their average MIDI velocity (real clip.color write-back)", category:"clips", parameters:{ track_index:{type:"number",description:"Track index",required:true}, scheme:{type:"string",description:"Color scheme",required:false,enum:Object.keys(RAMPS)} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.track_index]; if (!track) return { success:false, error:"Track not found" };
      const ramp = RAMPS[args.scheme] || RAMPS.heatmap; const clips = collectClips(track); let n = 0; const applied = [];
      for (let i = 0; i < clips.length; i++) { const c = clips[i]; const notes = c.notes || []; if (!notes.length) continue; const avg = notes.reduce((a: number, x: any) => a + (x.velocity ?? 100), 0) / notes.length; const col = pick(ramp, avg / 127); recordColor(c, args.track_index, i, "colorizer.color_by_velocity"); c.color = col; applied.push({ clip: c.name, velocity: Math.round(avg) }); n++; }
      if (!n) return { success:false, error:"No MIDI clips with notes on this track." };
      return { success:true, data:{ trackName:track.name, scheme:args.scheme||"heatmap", clipsColored:n, applied } };
    }
  );

  reg.register({ name:"color_by_pitch", description:"Color a track's clips by their average pitch (real clip.color write-back)", category:"clips", parameters:{ track_index:{type:"number",description:"Track index",required:true}, scheme:{type:"string",description:"Color scheme",required:false,enum:Object.keys(RAMPS)} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.track_index]; if (!track) return { success:false, error:"Track not found" };
      const ramp = RAMPS[args.scheme] || RAMPS.coolmap; const clips = collectClips(track); let n = 0; const applied = [];
      for (let i = 0; i < clips.length; i++) { const c = clips[i]; const notes = c.notes || []; if (!notes.length) continue; const avg = notes.reduce((a: number, x: any) => a + x.pitch, 0) / notes.length; const col = pick(ramp, Math.max(0, Math.min(1, (avg - 24) / 72))); recordColor(c, args.track_index, i, "colorizer.color_by_pitch"); c.color = col; applied.push({ clip: c.name, pitch: Math.round(avg) }); n++; }
      if (!n) return { success:false, error:"No MIDI clips with notes on this track." };
      return { success:true, data:{ trackName:track.name, scheme:args.scheme||"coolmap", clipsColored:n, applied } };
    }
  );

  reg.register({ name:"color_by_duration", description:"Color a track's clips by their length (real clip.color write-back)", category:"clips", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.track_index]; if (!track) return { success:false, error:"Track not found" };
      const clips = collectClips(track); if (!clips.length) return { success:false, error:"No clips on this track." };
      const COL = [0xff4444, 0xffd700, 0x44cc44]; let n = 0; const applied = [];
      for (let i = 0; i < clips.length; i++) { const c = clips[i]; const beats = c.duration ?? (c.notes ? Math.max(...c.notes.map((x: any) => x.startTime + (x.duration || 0)), 1) : 4); const bucket = beats < 4 ? 0 : beats <= 16 ? 1 : 2; recordColor(c, args.track_index, i, "colorizer.color_by_duration"); c.color = COL[bucket]; applied.push({ clip: c.name, beats: Number(beats.toFixed(1)), bucket: ["short","medium","long"][bucket] }); n++; }
      return { success:true, data:{ trackName:track.name, clipsColored:n, applied, ranges:{ short:"<4 beats → red", medium:"4–16 → yellow", long:">16 → green" } } };
    }
  );

  reg.register({ name:"clear_clip_colors", description:"Reset a track's clip colors to a neutral gray", category:"clips", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.track_index]; if (!track) return { success:false, error:"Track not found" };
      const clips = collectClips(track); let n = 0;
      for (let i = 0; i < clips.length; i++) { recordColor(clips[i], args.track_index, i, "colorizer.clear"); clips[i].color = NEUTRAL; n++; }
      return { success:true, data:{ trackName:track.name, clipsReset:n } };
    }
  );

  return reg;
}
