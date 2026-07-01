// Marimba / mallet (pure JS). A sine fundamental + odd harmonics with very fast amplitude decay
// and a soft click — wooden mallet / xylo tone. Brightness controls harmonic content.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthMarimba(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 60, decay = Math.max(0.1, p.decay ?? 0.55);
  const bright = clamp(p.brightness ?? 0.4, 0, 1), hard = clamp(p.hardness ?? 0.4, 0, 1);
  const len = Math.floor(sr * clamp(p.length ?? decay * 1.5 + 0.05, 0.2, 6));
  const f = noteHz(note);
  const out = new Float32Array(len); let p1 = 0, p3 = 0, p5 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    p1 += (2 * Math.PI * f) / sr; p3 += (2 * Math.PI * f * 3.93) / sr; p5 += (2 * Math.PI * f * 7.5) / sr; // wood-bar inharmonic ratios
    let s = Math.sin(p1) + bright * 0.35 * Math.sin(p3) * Math.exp(-t / (decay * 0.4)) + bright * 0.15 * Math.sin(p5) * Math.exp(-t / (decay * 0.2));
    if (t < 0.003) s += (Math.random() * 2 - 1) * hard * (1 - t / 0.003);
    out[i] = s * Math.exp(-t / decay);
  }
  return norm(out);
}
