// Módulo: Track Color Coordinator — Track has NO color property in the SDK (confirmed: only
// Clip.color is writable), so "coloring a track" is reinterpreted honestly as coloring every real
// clip on that track with the track's assigned scheme color (recordColor undo, like colorizer/colortheory).
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

const COLORS: any[] = [
  { name:"Red", hex:"#FF0000" }, { name:"Orange", hex:"#FF8C00" },
  { name:"Yellow", hex:"#FFD700" }, { name:"Green", hex:"#32CD32" },
  { name:"Teal", hex:"#20B2AA" }, { name:"Blue", hex:"#4169E1" },
  { name:"Purple", hex:"#9370DB" }, { name:"Pink", hex:"#FF69B4" }
];
const hexToInt = (hex: string) => parseInt(String(hex).replace("#", ""), 16);
function collectClips(track: any): any[] {
  const out: any[] = [];
  for (const slot of (track.clipSlots || [])) { if (slot?.clip) out.push(slot.clip); }
  for (const c of (track.arrangementClips || [])) { if (c) out.push(c); }
  return out;
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_tracks", description:"List all tracks with the real color of their first clip (Track itself has no color property)", category:"colors", parameters:{} },
    async (_a: any, song: any) => {
      const tracks = song.tracks || [];
      return { success:true, data:{ trackCount:tracks.length, tracks:tracks.map((t: any, i: number)=>{ const clips = collectClips(t); return { index:i, name:t.name||`Track ${i+1}`, firstClipColor: clips[0] ? `#${clips[0].color.toString(16).padStart(6,"0")}` : null, clipCount:clips.length }; }) } };
    }
  );

  reg.register({ name:"apply_color_scheme", description:"Color every track's clips with a per-track scheme color (real clip.color write-back, undoable)", category:"colors", parameters:{ scheme:{type:"string",description:"Color scheme",required:true,enum:["by-type","rainbow","gradient","vintage","neon","pastel","monochrome"]}, reverse:{type:"boolean",description:"Reverse color order",required:false} } },
    async (args: any, song: any) => {
      const tracks = song.tracks || [];
      const order = args.reverse ? [...COLORS].reverse() : COLORS;
      let clipsColored = 0; const perTrack: any[] = [];
      for (let i = 0; i < tracks.length; i++) {
        const col = order[i % order.length];
        const clips = collectClips(tracks[i]);
        for (let ci = 0; ci < clips.length; ci++) { recordColor(clips[ci], i, ci, "trackcolor.apply_color_scheme"); clips[ci].color = hexToInt(col.hex); clipsColored++; }
        perTrack.push({ trackIndex:i, name:tracks[i].name, color:col.hex, clipsColored:clips.length });
      }
      return { success:true, data:{ applied:true, scheme:args.scheme, tracksProcessed:tracks.length, clipsColored, perTrack } };
    }
  );

  reg.register({ name:"set_track_color", description:"Color a single track's real clips (recordColor undo)", category:"colors", parameters:{ track_index:{type:"number",description:"Track index",required:true}, color:{type:"string",description:"Hex color or color name",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.track_index]; if (!track) return { success:false, error:"Track not found" };
      const named = COLORS.find((c: any)=>c.name.toLowerCase()===String(args.color).toLowerCase());
      const hex = named?.hex || (String(args.color).startsWith("#") ? args.color : `#${args.color}`);
      const clips = collectClips(track);
      if (!clips.length) return { success:false, error:"No clips on this track to color." };
      const col = hexToInt(hex);
      for (let ci = 0; ci < clips.length; ci++) { recordColor(clips[ci], args.track_index, ci, "trackcolor.set_track_color"); clips[ci].color = col; }
      return { success:true, data:{ trackIndex:args.track_index, color:hex, clipsColored:clips.length, set:true } };
    }
  );

  reg.register({ name:"export_color_map", description:"Export each track's real first-clip color as a mapping", category:"colors", parameters:{ format:{type:"string",description:"Export format",required:false,enum:["json","csv"]} } },
    async (args: any, song: any) => {
      const tracks = song.tracks || [];
      const colorMap = tracks.map((t: any, i: number) => { const clips = collectClips(t); return { trackIndex:i, name:t.name||`Track ${i+1}`, color: clips[0] ? `#${clips[0].color.toString(16).padStart(6,"0")}` : null }; });
      if (args.format === "csv") return { success:true, data:{ format:"csv", content: "trackIndex,name,color\n" + colorMap.map((c: any) => `${c.trackIndex},${c.name},${c.color||""}`).join("\n") } };
      return { success:true, data:{ format:"json", colorMap } };
    }
  );

  return reg;
}
