// Acid (TB-303-style) bassline synthesis (pure JS). A sawtooth through a resonant low-pass with a
// per-note filter envelope, accent and slide, plus drive — a squelchy acid line over N bars.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

const PAT = [0, 0, 12, 0, 3, 0, 7, 0, 0, 10, 0, 0, 12, 0, 5, 3];
const ACC = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0];
const SLIDE = [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0];

export function synthAcid(p: any = {}, sr = 44100): Float32Array {
  const root = p.note ?? 36, bpm = clamp(p.bpm ?? 130, 60, 200);
  const stepN = Math.floor((60 / bpm) * 0.25 * sr), bars = Math.round(clamp(p.bars ?? 1, 1, 4)), steps = bars * 16;
  const len = stepN * steps;
  const cutoffBase = p.cutoff ?? 800, reso = clamp(p.reso ?? 0.7, 0, 0.95), envMod = (p.envMod ?? 60) / 100;
  const decay = Math.max(0.03, p.decay ?? 0.18), accentAmt = clamp(p.accent ?? 0.6, 0, 1), drive = clamp(p.drive ?? 0.5, 0, 1);
  const out = new Float32Array(len);
  let ph = 0, low = 0, band = 0, curF = noteHz(root);
  for (let i = 0; i < len; i++) {
    const step = Math.floor(i / stepN), inStep = (i % stepN) / sr, idx = step % 16;
    const targetF = noteHz(root + PAT[idx]);
    curF += (targetF - curF) * (SLIDE[idx] ? 0.0006 : 0.06);
    ph += (2 * Math.PI * curF) / sr;
    const saw = 2 * ((ph / (2 * Math.PI)) % 1) - 1;
    const acc = ACC[idx] ? 1 + accentAmt : 1;
    const env = Math.exp(-inStep / decay);
    const fc = clamp(cutoffBase * (1 + envMod * env * acc * 2), 60, sr * 0.45);
    const q = 1 - reso, f = 2 * Math.sin((Math.PI * fc) / sr);
    const high = saw - low - q * band; band += f * high; low += f * band;
    out[i] = Math.tanh(((low + band * 0.4) * acc * env) * (1 + drive * 4));
  }
  return norm(out);
}
