// 2-operator FM synthesis (pure JS) — bells / tines / e-piano. A carrier phase-modulated by a
// modulator at `ratio`, with a decaying modulation index and an exponential amplitude decay.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthBell(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 60, ratio = clamp(p.ratio ?? 2, 0.25, 12), index = clamp(p.index ?? 4, 0, 20);
  const decay = Math.max(0.1, p.decay ?? 1.3), bright = clamp(p.brightness ?? 0.5, 0, 1);
  const fc = noteHz(note), fm = fc * ratio;
  const len = Math.floor(sr * clamp(p.length ?? decay * 1.3 + 0.05, 0.2, 12));
  const out = new Float32Array(len); let phC = 0, phM = 0;
  const modDecay = decay * (0.4 + bright * 0.5);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    phM += (2 * Math.PI * fm) / sr; phC += (2 * Math.PI * fc) / sr;
    const idx = index * Math.exp(-t / modDecay);
    const s = Math.sin(phC + idx * Math.sin(phM));
    out[i] = s * Math.exp(-t / decay);
  }
  return norm(out);
}
