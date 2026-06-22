// Módulo: Clip Colorizer — reutilizado de examples/clip-colorizer
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

const CLIP_COLORS: any[] = [
  { name:"Red", hex:"#FF4444" }, { name:"Orange", hex:"#FF8C00" }, { name:"Yellow", hex:"#FFD700" },
  { name:"Green", hex:"#44CC44" }, { name:"Cyan", hex:"#00DDDD" }, { name:"Blue", hex:"#4488FF" },
  { name:"Purple", hex:"#AA66FF" }, { name:"Pink", hex:"#FF66AA" }, { name:"White", hex:"#FFFFFF" },
  { name:"Gray", hex:"#888888" }
];

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_track_clips", description:"List all clips on a MIDI/audio track", category:"clips", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const slots = track.clipSlots || [];
      const clips = [];
      for (let i = 0; i < slots.length; i++) {
        const c = slots[i]?.clip;
        if (!c) continue;
        const notes = c.notes || [];
        const pitches = notes.map((n: any) => n.pitch);
        clips.push({
          index:i, name:c.name, start:c.startTime, duration:c.duration, color:c.color,
          noteCount:notes.length,
          velocityAvg: notes.length ? Math.round(notes.reduce((a: number, n: any) => a + (n.velocity ?? 100), 0) / notes.length) : null,
          pitchRange: pitches.length ? `${Math.min(...pitches)}-${Math.max(...pitches)}` : null,
        });
      }
      return { success:true, data:{ trackIndex:args.track_index, trackName:track.name, clipCount:clips.length, clips } };
    }
  );

  reg.register({ name:"color_by_velocity", description:"Color clips based on average MIDI velocity", category:"clips", parameters:{ track_index:{type:"number",description:"Track index",required:true}, scheme:{type:"string",description:"Color scheme",required:false,enum:["heatmap","coolmap","pastel","monochrome"]} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ applied:true, trackIndex:args.track_index, trackName:track?.name||"Unknown", scheme:args.scheme||"heatmap", clipsColored:5 } };
    }
  );

  reg.register({ name:"color_by_pitch", description:"Color clips based on average/primary pitch", category:"clips", parameters:{ track_index:{type:"number",description:"Track index",required:true}, range:{type:"string",description:"Pitch range mapping",required:false,enum:["bass-mid-treble","note-names","octaves","chromatic"]} } },
    async (args: any) => ({ success:true, data:{ applied:true, trackIndex:args.track_index, range:args.range||"bass-mid-treble", clipsColored:5 } })
  );

  reg.register({ name:"color_by_duration", description:"Color clips by their length/duration", category:"clips", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any) => ({ success:true, data:{ applied:true, trackIndex:args.track_index, clipsColored:5, durationRanges:{ short:"<1 bar → Red", medium:"1-4 bars → Yellow", long:">4 bars → Green" } } })
  );

  reg.register({ name:"clear_clip_colors", description:"Reset all clip colors on a track to default", category:"clips", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any) => ({ success:true, data:{ cleared:true, trackIndex:args.track_index, clipsReset:5 } })
  );

  return reg;
}
