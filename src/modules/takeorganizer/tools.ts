// Módulo: Take Lane Organizer — enumerates a track's take lanes (track.takeLanes) and
// auto-labels them from their content (takeLane.name). The SDK exposes take lanes but no
// TakeLane context scope, so this works by reading clips and writing names directly.
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

function laneSummary(lane: any) {
  const clips = lane.clips || [];
  let notes = 0, lo = 128, hi = -1, hasMidi = false;
  for (const c of clips) {
    if (Array.isArray(c.notes)) { hasMidi = true; notes += c.notes.length; for (const n of c.notes) { lo = Math.min(lo, n.pitch); hi = Math.max(hi, n.pitch); } }
  }
  return { clipCount: clips.length, notes, hasMidi, lo: hi >= 0 ? lo : null, hi: hi >= 0 ? hi : null };
}
function registerLabel(avgPitch: number) {
  if (avgPitch < 48) return "Bass";
  if (avgPitch < 60) return "Low";
  if (avgPitch < 72) return "Mid";
  return "High";
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"list", description:"List a track's take lanes with their clips/content", category:"tracks", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t) return { success:false, error:"Track not found" };
      const lanes = t.takeLanes || [];
      if (!lanes.length) return { success:true, data:{ track:t.name, laneCount:0, lanes:[], note:"This track has no take lanes." } };
      const out = lanes.map((l: any, i: number) => ({ index:i, name:l.name, ...laneSummary(l) }));
      return { success:true, data:{ track:t.name, laneCount:out.length, lanes:out } };
    }
  );

  reg.register({ name:"autolabel", description:"Auto-name take lanes from their content (register + density) or by index", category:"tracks", parameters:{ track_index:{type:"number",description:"Track index",required:true}, scheme:{type:"string",description:"Naming scheme",required:false,enum:["content","index"]}, prefix:{type:"string",description:"Prefix for index scheme (default 'Take')",required:false} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t) return { success:false, error:"Track not found" };
      const lanes = t.takeLanes || [];
      if (!lanes.length) return { success:false, error:"This track has no take lanes." };
      const scheme = args.scheme || "content";
      const prefix = args.prefix || "Take";
      const renames = [];
      for (let i = 0; i < lanes.length; i++) {
        const l = lanes[i]; const s = laneSummary(l);
        let name: string;
        if (scheme === "index" || !s.hasMidi || s.lo == null) name = `${prefix} ${i + 1}`;
        else { const avg = (s.lo + s.hi) / 2; name = `${i + 1} · ${registerLabel(avg)} (${s.notes}n)`; }
        const old = l.name; l.name = name; renames.push({ index:i, from:old, to:name });
      }
      return { success:true, data:{ track:t.name, scheme, renamed: renames.length, renames } };
    }
  );

  return reg;
}
