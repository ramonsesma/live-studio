// Reverse-Sweep (pure JS). A rising noise/tone build that STOPS hard at a hit — the reverse-
// cymbal / reverse-riser transition into a downbeat. Inverse envelope of a Riser with a hard cut.
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthReverseSweep(p: any = {}, sr = 44100): Float32Array {
  const len = Math.floor(sr * clamp(p.length ?? 1.5, 0.2, 6));
  const color = clamp(p.color ?? 0.5, 0, 1), drive = clamp(p.drive ?? 0.4, 0, 1), hit = clamp((p.hit ?? 40) / 100, 0, 1);
  const out = new Float32Array(len);
  const pink = [0,0,0,0,0,0,0]; let low = 0, band = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const w = Math.random() * 2 - 1;
    pink[0] = 0.99886 * pink[0] + w * 0.0555179; pink[1] = 0.99332 * pink[1] + w * 0.0750759; pink[2] = 0.96900 * pink[2] + w * 0.1538520; pink[3] = 0.86650 * pink[3] + w * 0.3104856; pink[4] = 0.55000 * pink[4] + w * 0.5329522; pink[5] = -0.7616 * pink[5] - w * 0.0168980;
    const pn = (pink[0] + pink[1] + pink[2] + pink[3] + pink[4] + pink[5] + pink[6] + w * 0.5362) * 0.11; pink[6] = w * 0.115926;
    const src = w * (1 - color) + pn * color;
    const fc = clamp(300 + Math.pow(t, 2) * 7000, 80, sr * 0.45), f = 2 * Math.sin((Math.PI * fc) / sr), q = 0.5;
    const high = src - low - q * band; band += f * high; low += f * band;
    const env = t; // rising build
    out[i] = Math.tanh(band * env * (1 + drive * 3));
  }
  // hard hit at the very end, then instant silence (the "cut")
  const hitLen = Math.floor(sr * 0.02);
  for (let i = 0; i < hitLen && len - hitLen + i >= 0; i++) out[len - hitLen + i] += (Math.random() * 2 - 1) * hit * (1 - i / hitLen);
  return norm(out);
}
