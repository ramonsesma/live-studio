// Módulo: Pattern Language — a tiny TidalCycles-style mini-notation that COMPILES to a MIDI
// clip (offline; no real-time MIDI / virtual ports, which the SDK can't do). Tokens divide the
// cycle equally: notes (c3, g#4), rests (~ .), subdivisions ([a b]) and repeats (x*3).
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

const PCB: Record<string, number> = { c:0, d:2, e:4, f:5, g:7, a:9, b:11 };
type Node = { type: "note"; pitch: number } | { type: "rest" } | { type: "group"; children: Node[] };

function parseNote(tok: string): number | null {
  if (/^-?\d+$/.test(tok)) { const p = parseInt(tok, 10); return p >= 0 && p <= 127 ? p : null; }
  const m = tok.toLowerCase().match(/^([a-g])([#b]?)(-?\d+)$/);
  if (!m) return null;
  let pc = PCB[m[1]]; if (m[2] === "#") pc++; else if (m[2] === "b") pc--;
  const midi = (parseInt(m[3], 10) + 1) * 12 + pc;
  return midi >= 0 && midi <= 127 ? midi : null;
}
// Split a pattern string into top-level tokens, respecting [ ] nesting.
function tokenizeTop(str: string): string[] {
  const out: string[] = []; let buf = "", depth = 0;
  for (const ch of str.trim()) {
    if (ch === "[") { depth++; buf += ch; }
    else if (ch === "]") { depth--; buf += ch; }
    else if (/\s/.test(ch) && depth === 0) { if (buf) { out.push(buf); buf = ""; } }
    else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}
function parseToken(tok: string): Node {
  if (tok === "~" || tok === ".") return { type: "rest" };
  if (tok.startsWith("[") && tok.endsWith("]")) return { type: "group", children: tokenizeTop(tok.slice(1, -1)).map(parseToken) };
  const star = tok.indexOf("*");
  if (star > 0) { const base = parseToken(tok.slice(0, star)); const n = Math.max(1, Math.min(32, parseInt(tok.slice(star + 1), 10) || 1)); return { type: "group", children: Array.from({ length: n }, () => base) }; }
  const p = parseNote(tok);
  return p == null ? { type: "rest" } : { type: "note", pitch: p };
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"examples", description:"Example patterns for the mini-notation", category:"generative", parameters:{} },
    async () => ({ success:true, data:{ syntax:[
      "Tokens split the cycle equally. note = c3 / g#4 / 60 ; rest = ~ or . ; subdivide = [a b] ; repeat = x*3.",
      "Examples:",
      "c3 e3 g3 c4            → four equal quarter notes",
      "c3 ~ [e3 g3] c4        → a rest and a subdivided beat",
      "c2*4 ~ c2*2 ~          → kick-style repeats",
      "[c3 e3 g3] [f3 a3 c4]  → two fast triads",
    ] } })
  );

  reg.register({ name:"compile", description:"Compile a mini-notation pattern into a MIDI clip", category:"generative", parameters:{ pattern:{type:"string",description:"e.g. 'c3 e3 [g3 b3] c4'",required:true}, bars:{type:"number",description:"Bars the pattern spans (default 1)",required:false}, velocity:{type:"number",description:"Note velocity (default 100)",required:false}, gate:{type:"number",description:"Note length as % of its slot (default 90)",required:false}, track_index:{type:"number",description:"Existing track (omit = new)",required:false} } },
    async (args: any, song: any) => {
      const nodes = tokenizeTop(String(args.pattern || "")).map(parseToken);
      if (!nodes.length) return { success:false, error:"Empty pattern." };
      const bars = Math.max(1, Math.min(8, args.bars || 1));
      const span = bars * 4;
      const vel = Math.max(1, Math.min(127, args.velocity ?? 100));
      const gate = Math.max(0.05, Math.min(1, (args.gate ?? 90) / 100));
      const notes: any[] = [];
      const emit = (ns: Node[], start: number, len: number) => {
        const slice = len / ns.length;
        ns.forEach((n, i) => { const s = start + i * slice; if (n.type === "note") notes.push({ pitch: n.pitch, startTime: Number(s.toFixed(4)), duration: Number((slice * gate).toFixed(4)), velocity: vel }); else if (n.type === "group") emit(n.children, s, slice); });
      };
      emit(nodes, 0, span);
      if (!notes.length) return { success:false, error:"Pattern compiled to no notes (all rests?)." };
      const track = args.track_index != null ? song.tracks[args.track_index] : await song.createMidiTrack();
      if (!track) return { success:false, error:"Track not found" };
      if (args.track_index == null) track.name = "Pattern";
      const clip = await track.createMidiClip(0, span); clip.name = String(args.pattern).slice(0, 24);
      clip.notes = notes;
      return { success:true, data:{ pattern: args.pattern, bars, steps: nodes.length, noteCount: notes.length, trackIndex: song.tracks.indexOf(track), clipName: clip.name, notes: notes.slice(0, 200).map((n) => ({ pitch: n.pitch, start: n.startTime, dur: n.duration })) } };
    }
  );

  return reg;
}
