// Módulo: Key & Scale Detective — scans every MIDI clip's notes, builds a duration-weighted
// pitch-class histogram and runs Krumhansl–Schmuckler key detection. Flags out-of-scale
// ("foreign") notes and compares against Live's currently selected scale
// (song.rootNote / scaleName / scaleIntervals) — all pure SDK, deterministic.
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

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const SCALE_PCS: any = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };

function pearson(a: number[], b: number[]): number {
  const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

// Rank all 24 keys by correlation of the histogram with rotated K-S profiles.
function detectKeys(hist: number[]) {
  const out: { root: number; key: string; scale: string; score: number }[] = [];
  for (let t = 0; t < 12; t++) {
    const rotM = MAJOR.map((_, i) => MAJOR[(i - t + 12) % 12]);
    const rotm = MINOR.map((_, i) => MINOR[(i - t + 12) % 12]);
    out.push({ root: t, key: `${NOTE_NAMES[t]} major`, scale: "major", score: pearson(hist, rotM) });
    out.push({ root: t, key: `${NOTE_NAMES[t]} minor`, scale: "minor", score: pearson(hist, rotm) });
  }
  return out.sort((a, b) => b.score - a.score);
}

// Walk the set (or one track) and gather notes from every MIDI clip.
function gatherNotes(song: any, trackIndex?: number) {
  const tracks = song?.tracks || [];
  const list = trackIndex != null ? [tracks[trackIndex]].filter(Boolean) : tracks;
  const notes: any[] = [];
  for (const t of list) {
    const clips: any[] = [];
    for (const sl of t.clipSlots || []) if (sl?.clip) clips.push(sl.clip);
    for (const c of t.arrangementClips || []) if (c) clips.push(c);
    for (const c of clips) if (Array.isArray(c.notes)) for (const n of c.notes) notes.push(n);
  }
  return notes;
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"detect_key", description:"Detect the most likely key/scale of the set (or a track) via a pitch-class histogram and Krumhansl–Schmuckler key profiles", category:"analysis", parameters:{ track_index:{type:"number",description:"Limit to one track (omit = whole set)",required:false}, demo:{type:"boolean",description:"Use a synthetic A-minor histogram (offline preview)",required:false} } },
    async (args: any, song: any) => {
      let hist = new Array(12).fill(0);
      let noteCount = 0;
      if (args.demo) { hist = [3.2, 0.2, 2.1, 0.4, 2.8, 1.9, 0.3, 3.0, 0.5, 4.1, 0.4, 1.6]; noteCount = 64; }
      else {
        const notes = gatherNotes(song, args.track_index);
        noteCount = notes.length;
        for (const n of notes) hist[((n.pitch % 12) + 12) % 12] += Math.max(0.1, n.duration || 0.25);
        if (!noteCount) return { success:false, error:"No MIDI notes found to analyze." };
      }
      const ranked = detectKeys(hist);
      const best = ranked[0];
      const live = {
        root: song?.rootNote ?? null,
        rootName: song?.rootNote != null ? NOTE_NAMES[song.rootNote % 12] : null,
        name: song?.scaleName ?? null,
        intervals: Array.isArray(song?.scaleIntervals) ? song.scaleIntervals : null,
        mode: song?.scaleMode ?? null,
      };
      const matchesLive = live.rootName != null && best.key.toLowerCase().startsWith(live.rootName.toLowerCase());
      return { success:true, data:{
        noteCount,
        histogram: hist.map((v, i) => ({ pc: i, name: NOTE_NAMES[i], weight: Number(v.toFixed(2)) })),
        best: { key: best.key, scale: best.scale, root: best.root, confidence: Number(Math.max(0, best.score).toFixed(3)) },
        candidates: ranked.slice(0, 5).map((c) => ({ key: c.key, scale: c.scale, root: c.root, score: Number(c.score.toFixed(3)) })),
        liveScale: live, matchesLive,
      } };
    }
  );

  reg.register({ name:"find_foreign_notes", description:"List notes that fall outside a given (or detected) key/scale", category:"analysis", parameters:{ track_index:{type:"number",description:"Track index",required:true}, root:{type:"number",description:"Tonic pitch-class 0-11 (omit = auto-detect)",required:false}, scale:{type:"string",description:"major/minor (omit = auto-detect)",required:false,enum:["major","minor"]} } },
    async (args: any, song: any) => {
      const notes = gatherNotes(song, args.track_index);
      if (!notes.length) return { success:false, error:"No MIDI notes on this track." };
      let root = args.root, scale = args.scale;
      if (root == null || !scale) {
        const hist = new Array(12).fill(0);
        for (const n of notes) hist[((n.pitch % 12) + 12) % 12] += Math.max(0.1, n.duration || 0.25);
        const best = detectKeys(hist)[0]; root = best.root; scale = best.scale;
      }
      const pcs = new Set(SCALE_PCS[scale].map((i: number) => (i + root) % 12));
      const foreign = notes
        .filter((n) => !pcs.has(((n.pitch % 12) + 12) % 12))
        .map((n) => ({ pitch: n.pitch, name: NOTE_NAMES[((n.pitch % 12) + 12) % 12] + (Math.floor(n.pitch / 12) - 1), start: n.startTime, velocity: n.velocity ?? 100 }))
        .sort((a, b) => a.start - b.start);
      return { success:true, data:{ key: `${NOTE_NAMES[root]} ${scale}`, root, scale, total: notes.length, foreignCount: foreign.length, inKeyPct: Number((100 * (1 - foreign.length / notes.length)).toFixed(1)), foreign: foreign.slice(0, 200) } };
    }
  );

  return reg;
}
