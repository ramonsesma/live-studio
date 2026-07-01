// Glitch FX (pure JS). A seed-driven mosaic of micro-slices each randomly processed (reverse,
// bitcrush, stutter, pitch jump, gate). Generates a rhythmic glitch FX clip — IDM-style.
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }
function mulberry32(seed: number): () => number { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function synthGlitch(p: any = {}, sr = 44100): Float32Array {
  const bpm = clamp(p.bpm ?? 130, 60, 200), bars = Math.round(clamp(p.bars ?? 1, 1, 4));
  const len = Math.floor((60 / bpm) * 4 * bars * sr);
  const density = clamp((p.density ?? 70) / 100, 0.1, 1), seed = p.seed ?? 1, drive = clamp(p.drive ?? 0.5, 0, 1);
  const baseNote = p.note ?? 60, srcType = p.source || "saw";
  const rng = mulberry32(seed);
  // build a source layer: saw / noise / sine bursts at the base pitch
  const src = new Float32Array(len);
  const baseFreq = 440 * Math.pow(2, (baseNote - 69) / 12);
  let ph = 0;
  for (let i = 0; i < len; i++) { ph += (2 * Math.PI * baseFreq) / sr; src[i] = srcType === "noise" ? Math.random() * 2 - 1 : srcType === "sine" ? Math.sin(ph) : 2 * ((ph / (2 * Math.PI)) % 1) - 1; }
  // chop into ~1/32 micro-slices and randomize each
  const sliceN = Math.floor((60 / bpm) * 0.125 * sr);
  const out = new Float32Array(len);
  for (let off = 0; off < len; off += sliceN) {
    if (rng() > density) continue;
    const slice = src.subarray(off, Math.min(len, off + sliceN));
    let proc = slice.slice();
    if (rng() < 0.35) { const r = new Float32Array(proc.length); for (let i = 0; i < proc.length; i++) r[i] = proc[proc.length - 1 - i]; proc = r; }
    if (rng() < 0.4) { const reps = 2 + Math.floor(rng() * 3), seg = Math.floor(proc.length / reps); for (let i = 0; i < proc.length; i++) proc[i] = proc[i % Math.max(1, seg)]; }
    if (rng() < 0.5) { const bits = 2 + Math.floor(rng() * 6), levels = Math.pow(2, bits); for (let i = 0; i < proc.length; i++) proc[i] = Math.round(proc[i] * levels) / levels; }
    if (rng() < 0.3) { const r = rng() * 2 + 0.25; const out2 = new Float32Array(proc.length); for (let i = 0; i < proc.length; i++) { const t = i / r, i0 = Math.floor(t); out2[i] = proc[Math.min(proc.length - 1, i0)] || 0; } proc = out2; }
    for (let i = 0; i < proc.length && off + i < len; i++) out[off + i] = Math.tanh(proc[i] * (1 + drive * 2.5));
  }
  return norm(out);
}
