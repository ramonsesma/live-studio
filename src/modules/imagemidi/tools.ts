// Módulo: Image → MIDI — converts a luminance grid into REAL notes on a new track. The rich
// panel decodes any image in the webview (Canvas API) and sends a compact grid string; the
// tool itself is deterministic and pure-SDK. Rows map top→bottom to high→low pitches.
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

const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  minor_pentatonic: [0, 3, 5, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};
const PC: Record<string, number> = { c:0,"c#":1,db:1,d:2,"d#":3,eb:3,e:4,f:5,"f#":6,gb:6,g:7,"g#":8,ab:8,a:9,"a#":10,bb:10,b:11 };

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"grid_to_notes", description:"Write a luminance grid (rows of 0-9 levels, '/'-separated — the Image→MIDI panel builds this from any image) as REAL notes on a new MIDI track: rows = pitches (scale-mapped), columns = time steps, level = velocity", category:"generative", parameters:{ grid:{type:"string",description:"Rows of digits 0-9 separated by '/', e.g. \"0907/5005\" (0 = no note). Max 48 rows × 128 cols",required:true}, scale:{type:"string",description:"Pitch scale (default minor_pentatonic)",required:false,enum:Object.keys(SCALES)}, root:{type:"string",description:"Root note (default C)",required:false}, low_note:{type:"number",description:"Lowest MIDI pitch of the grid (default 36)",required:false}, step_beats:{type:"number",description:"Beats per column (default 0.25 = 1/16)",required:false}, track_index:{type:"number",description:"Write onto this track (omit = create a new one)",required:false}, name:{type:"string",description:"Clip/track name (default Image MIDI)",required:false} } },
    async (args: any, song: any) => {
      const rows = String(args.grid || "").split("/").map((r: string) => r.trim()).filter(Boolean);
      if (!rows.length) return { success:false, error:"grid must be digit rows separated by '/'" };
      if (rows.length > 48) return { success:false, error:"Max 48 rows." };
      if (rows.some((r: string) => !/^[0-9]+$/.test(r))) return { success:false, error:"Rows must contain only digits 0-9." };
      const cols = Math.max(...rows.map((r: string) => r.length));
      if (cols > 128) return { success:false, error:"Max 128 columns." };
      const scale = SCALES[args.scale] || SCALES.minor_pentatonic;
      const rootPc = PC[String(args.root ?? "c").trim().toLowerCase()] ?? 0;
      const low = Math.max(0, Math.min(96, args.low_note ?? 36));
      const step = Math.max(0.0625, Math.min(4, args.step_beats ?? 0.25));
      // Row r (top) → the (rows-1-r)-th scale degree above low, so the image isn't upside down.
      const pitchForRow = (r: number) => {
        const idx = rows.length - 1 - r;
        const oct = Math.floor(idx / scale.length), deg = idx % scale.length;
        return Math.min(127, low + rootPc + oct * 12 + scale[deg]);
      };
      const notes: any[] = [];
      for (let r = 0; r < rows.length; r++) {
        const pitch = pitchForRow(r);
        let c = 0;
        while (c < rows[r].length) {
          const lvl = +rows[r][c];
          if (lvl > 0) {
            // merge consecutive same-level cells into one held note
            let end = c + 1;
            while (end < rows[r].length && +rows[r][end] === lvl) end++;
            notes.push({ pitch, startTime: Number((c * step).toFixed(6)), duration: Number(((end - c) * step * 0.95).toFixed(6)), velocity: Math.max(20, Math.min(127, lvl * 14)) });
            c = end;
          } else c++;
        }
      }
      if (!notes.length) return { success:false, error:"The grid has no cells above 0 — nothing to write." };
      if (notes.length > 2000) return { success:false, error:`${notes.length} notes is too dense — reduce the grid resolution.` };
      let track = args.track_index !== undefined ? song?.tracks?.[args.track_index] : null;
      if (args.track_index !== undefined && !track) return { success:false, error:"Track not found" };
      if (!track) { track = await song.createMidiTrack(); track.name = args.name || "Image MIDI"; }
      const span = Math.max(4, Math.ceil((cols * step) / 4) * 4);
      const clip = await track.createMidiClip(0, span);
      clip.name = args.name || "Image MIDI";
      clip.notes = notes;
      return { success:true, data:{ written:true, trackIndex:song.tracks.indexOf(track), clipName:clip.name, rows:rows.length, cols, noteCount:notes.length, spanBeats:span, scale:args.scale || "minor_pentatonic" } };
    }
  );

  return reg;
}
