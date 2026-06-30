// Cinematic impact / boom / downer synthesis (pure JS). A low pitch-glided sine boom + a filtered
// noise crack + a feedback reverb tail, with drive — big hits and downlifters.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthImpact(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 28, boomDecay = Math.max(0.1, p.boomDecay ?? 0.7), noiseAmt = clamp((p.noise ?? 50) / 100, 0, 1);
  const tail = clamp(p.tail ?? 0.4, 0, 0.9), drive = clamp(p.drive ?? 0.4, 0, 1), downpitch = clamp(p.downpitch ?? 12, 0, 36);
  const len = Math.floor(sr * clamp(p.length ?? 1.6, 0.3, 6));
  const f0 = noteHz(note), fStart = f0 * Math.pow(2, downpitch / 12);
  const out = new Float32Array(len); let ph = 0, lpN = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const f = f0 + (fStart - f0) * Math.exp(-t / 0.25);
    ph += (2 * Math.PI * f) / sr;
    const boom = Math.sin(ph) * Math.exp(-t / boomDecay);
    const n = Math.random() * 2 - 1; lpN += 0.06 * (n - lpN); // low-passed noise
    const crack = (lpN + n * 0.3) * noiseAmt * Math.exp(-t / 0.12);
    out[i] = Math.tanh((boom + crack) * (1 + drive * 3));
  }
  if (tail > 0) { const dl = Math.max(1, Math.floor(0.05 * sr)); for (let i = dl; i < len; i++) out[i] += out[i - dl] * tail * 0.6; }
  return norm(out);
}
