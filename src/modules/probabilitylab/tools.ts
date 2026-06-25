// Módulo: Probability Lab — generates variations of a MIDI clip using the SDK's native
// note.probability, note.releaseVelocity and velocityDeviation (release velocity is a property
// we hadn't touched). Live re-rolls the result on every loop. Pure note math → new clips.
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

type N = { pitch: number; startTime: number; duration: number; velocity: number; probability?: number; releaseVelocity?: number; velocityDeviation?: number };
const clampV = (v: number) => Math.max(1, Math.min(127, Math.round(v)));

const TREATMENTS: { label: string; fn: (ns: N[], span: number) => N[] }[] = [
  { label: "Thinned", fn: (ns) => ns.map((n, i) => ({ ...n, probability: i % 4 === 0 ? 1 : Number((0.4 + Math.random() * 0.3).toFixed(2)) })) },
  { label: "Ghost notes", fn: (ns, span) => { const out = ns.map((n) => ({ ...n, probability: 1 })); for (const n of ns) { const g = n.startTime + (n.duration || 0.5) / 2; if (g < span) out.push({ pitch: n.pitch, startTime: g, duration: (n.duration || 0.5) / 2, velocity: clampV((n.velocity || 100) * 0.4), probability: Number((0.3 + Math.random() * 0.2).toFixed(2)) }); } return out; } },
  { label: "Release dynamics", fn: (ns) => ns.map((n) => ({ ...n, releaseVelocity: 20 + Math.round(Math.random() * 100) })) },
  { label: "Humanized prob", fn: (ns) => ns.map((n) => { const onBeat = Math.abs(n.startTime - Math.round(n.startTime)) < 0.01; return { ...n, probability: onBeat ? 1 : Number((0.6 + Math.random() * 0.3).toFixed(2)), velocityDeviation: 10 + Math.round(Math.random() * 15) }; }) },
  { label: "Stutter echoes", fn: (ns, span) => { const out: N[] = []; for (const n of ns) { out.push({ ...n, probability: 1 }); for (let k = 1; k <= 2; k++) { const t = n.startTime + k * 0.125; if (t < span) out.push({ pitch: n.pitch, startTime: t, duration: 0.1, velocity: clampV((n.velocity || 100) * (0.7 - k * 0.2)), probability: Number(Math.max(0.2, 0.7 - k * 0.25).toFixed(2)) }); } } return out; } },
];

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"list_treatments", description:"List the probability treatments", category:"generative", parameters:{} },
    async () => ({ success:true, data:{ treatments: TREATMENTS.map((t, i) => ({ id: i, label: t.label })) } })
  );

  reg.register({ name:"generate", description:"Generate variations using native note probability / releaseVelocity / velocityDeviation, as new clips", category:"generative", parameters:{ track_index:{type:"number",description:"Source track index",required:true}, clip_index:{type:"number",description:"Source clip index (default 0)",required:false}, count:{type:"number",description:"How many variations (1-5, default 4)",required:false} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t) return { success:false, error:"Track not found" };
      const clip = t.clipSlots?.[args.clip_index ?? 0]?.clip ?? t.arrangementClips?.[args.clip_index ?? 0];
      if (!clip || !Array.isArray(clip.notes) || !clip.notes.length) return { success:false, error:"No MIDI clip with notes here." };
      const src: N[] = clip.notes.map((n: any) => ({ pitch:n.pitch, startTime:n.startTime, duration:n.duration, velocity:n.velocity ?? 100 }));
      const span = Math.max(4, ...src.map((n) => n.startTime + n.duration));
      const count = Math.max(1, Math.min(5, args.count || 4));
      const variations: any[] = [];
      for (let i = 0; i < count; i++) {
        const tr = TREATMENTS[i % TREATMENTS.length];
        const notes = tr.fn(src.map((n) => ({ ...n })), span);
        const track = await song.createMidiTrack(); track.name = `Prob: ${tr.label}`;
        const c = await track.createMidiClip(0, span); c.name = `${clip.name || "Clip"} · ${tr.label}`;
        c.notes = notes.map((n) => ({ pitch:n.pitch, startTime:Math.max(0, n.startTime), duration:n.duration, velocity:clampV(n.velocity), ...(n.probability != null ? { probability:n.probability } : {}), ...(n.releaseVelocity != null ? { releaseVelocity:n.releaseVelocity } : {}), ...(n.velocityDeviation != null ? { velocityDeviation:n.velocityDeviation } : {}) }));
        variations.push({ treatment:tr.label, trackIndex:song.tracks.indexOf(track), clipName:c.name, noteCount:notes.length, usesProbability: notes.some((n) => n.probability != null && n.probability < 1), usesReleaseVel: notes.some((n) => n.releaseVelocity != null), notes: notes.slice(0, 160).map((n) => ({ pitch:n.pitch, start:Number(n.startTime.toFixed(3)), duration:n.duration, prob:n.probability ?? 1 })) });
      }
      return { success:true, data:{ source:{ track:t.name, clip:clip.name, noteCount:src.length }, span, count:variations.length, variations } };
    }
  );

  return reg;
}
