// Electric Piano (pure JS). 2-op FM (lower index than the bell) — Rhodes / DX7-style e-piano:
// carrier modulated at ratio 1 with a decaying index, soft attack and long sustain.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthEPiano(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 60, ratio = clamp(p.ratio ?? 1, 0.25, 4), index = clamp(p.index ?? 2, 0, 8);
  const decay = Math.max(0.2, p.decay ?? 1.8), bright = clamp(p.brightness ?? 0.4, 0, 1);
  const len = Math.floor(sr * clamp(p.length ?? decay * 1.2 + 0.05, 0.3, 8));
  const fc = noteHz(note), fm = fc * ratio;
  const out = new Float32Array(len); let phC = 0, phM = 0;
  const atk = Math.floor(sr * 0.008), modDec = decay * (0.5 + bright * 0.4);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    phM += (2 * Math.PI * fm) / sr; phC += (2 * Math.PI * fc) / sr;
    const idx = index * Math.exp(-t / modDec);
    let s = Math.sin(phC + idx * Math.sin(phM));
    if (t < 0.004) s += (Math.random() * 2 - 1) * 0.18; // soft hammer
    const env = (i < atk ? i / atk : 1) * Math.exp(-t / decay);
    out[i] = s * env;
  }
  return norm(out);
}
