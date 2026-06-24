// Módulo: Clip Variation Engine — generates N algorithmic variations of a MIDI clip
// (rotate, reverse, thin, humanize, swing, strum, arpeggiate, echo, octave/fifth) and writes
// each as a new MIDI clip so you can compare. Pure note math over MidiClip.notes.
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

type N = { pitch: number; startTime: number; duration: number; velocity: number };
const clamp = (v: number) => Math.max(1, Math.min(127, Math.round(v)));
function byStart(ns: N[]): Record<string, N[]> { const m: Record<string, N[]> = {}; for (const n of ns) (m[n.startTime.toFixed(3)] ||= []).push(n); return m; }

const TRANSFORMS: Record<string, { label: string; fn: (ns: N[]) => N[] }> = {
  reverse: { label: "Reverse", fn: (ns) => { const span = Math.max(0, ...ns.map((n) => n.startTime + n.duration)); return ns.map((n) => ({ ...n, startTime: Math.max(0, span - (n.startTime + n.duration)) })); } },
  rotate: { label: "Rotate pitches", fn: (ns) => { const s = ns.slice().sort((a, b) => a.startTime - b.startTime); const ps = s.map((n) => n.pitch); const k = Math.max(1, Math.floor(ps.length / 3)); return s.map((n, i) => ({ ...n, pitch: ps[(i + k) % ps.length] })); } },
  octaveUp: { label: "Octave up", fn: (ns) => ns.map((n) => ({ ...n, pitch: Math.min(127, n.pitch + 12) })) },
  fifth: { label: "Up a 5th", fn: (ns) => ns.map((n) => ({ ...n, pitch: Math.min(127, n.pitch + 7) })) },
  thin: { label: "Thin out", fn: (ns) => ns.slice().sort((a, b) => a.startTime - b.startTime).filter((_, i) => i % 2 === 0) },
  humanize: { label: "Humanize", fn: (ns) => ns.map((n) => ({ ...n, startTime: Math.max(0, n.startTime + (Math.random() - 0.5) * 0.06), velocity: clamp((n.velocity || 100) + (Math.random() - 0.5) * 30) })) },
  swing: { label: "Swing", fn: (ns) => ns.map((n) => ({ ...n, startTime: n.startTime + (Math.round(n.startTime / 0.5) % 2 === 1 ? 0.08 : 0) })) },
  strum: { label: "Strum", fn: (ns) => { const g = byStart(ns); const out: N[] = []; for (const k in g) g[k].sort((a, b) => a.pitch - b.pitch).forEach((n, i) => out.push({ ...n, startTime: n.startTime + i * 0.03 })); return out; } },
  arpeggiate: { label: "Arpeggiate", fn: (ns) => { const g = byStart(ns); const out: N[] = []; for (const k in g) { const c = g[k].sort((a, b) => a.pitch - b.pitch); const step = (c[0].duration || 1) / c.length; c.forEach((n, i) => out.push({ ...n, startTime: n.startTime + i * step, duration: step * 0.9 })); } return out; } },
  echo: { label: "Echo", fn: (ns) => { const out = ns.slice(); for (const n of ns) out.push({ ...n, startTime: n.startTime + 0.5, velocity: clamp((n.velocity || 100) * 0.6) }); return out; } },
};
const DEFAULT_ORDER = ["rotate", "reverse", "humanize", "arpeggiate", "swing", "octaveUp", "thin", "echo", "strum", "fifth"];

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"list_transforms", description:"List the available variation transforms", category:"variations", parameters:{} },
    async () => ({ success:true, data:{ transforms: Object.entries(TRANSFORMS).map(([id, t]) => ({ id, label: t.label })) } })
  );

  reg.register({ name:"generate_variations", description:"Generate N algorithmic variations of a MIDI clip as new clips", category:"variations", parameters:{ track_index:{type:"number",description:"Source track index",required:true}, clip_index:{type:"number",description:"Source clip index (default 0)",required:false}, count:{type:"number",description:"How many variations (1-8, default 4)",required:false}, transforms:{type:"string",description:"Comma-separated transform ids (omit = auto mix)",required:false} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t) return { success:false, error:"Track not found" };
      const clip = t.clipSlots?.[args.clip_index ?? 0]?.clip ?? t.arrangementClips?.[args.clip_index ?? 0];
      if (!clip || !Array.isArray(clip.notes) || !clip.notes.length) return { success:false, error:"No MIDI clip with notes here." };
      const src: N[] = clip.notes.map((n: any) => ({ pitch:n.pitch, startTime:n.startTime, duration:n.duration, velocity:n.velocity ?? 100 }));
      const count = Math.max(1, Math.min(8, args.count || 4));
      const ids = (args.transforms ? String(args.transforms).split(",").map((s: string)=>s.trim()).filter((id: string)=>TRANSFORMS[id]) : DEFAULT_ORDER).slice();
      const span = Math.max(4, ...src.map((n) => n.startTime + n.duration));
      const variations: any[] = [];
      for (let i = 0; i < count; i++) {
        const id = ids[i % ids.length]; const tr = TRANSFORMS[id];
        const notes = tr.fn(src.map((n) => ({ ...n }))).filter((n) => n.startTime < span);
        const track = await song.createMidiTrack(); track.name = `Var: ${tr.label}`;
        const c = await track.createMidiClip(0, span); c.name = `${clip.name || "Clip"} · ${tr.label}`;
        c.notes = notes.map((n) => ({ pitch:n.pitch, startTime:Math.max(0, n.startTime), duration:n.duration, velocity:clamp(n.velocity) }));
        variations.push({ transform:id, label:tr.label, trackIndex:song.tracks.indexOf(track), clipName:c.name, noteCount:notes.length, notes: notes.slice(0, 200).map((n) => ({ pitch:n.pitch, start:Number(n.startTime.toFixed(3)), duration:n.duration })) });
      }
      return { success:true, data:{ source:{ track:t.name, clip:clip.name, noteCount:src.length }, span, count:variations.length, variations } };
    }
  );

  return reg;
}
