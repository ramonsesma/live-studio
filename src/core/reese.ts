// Reese Bass (pure JS). Two saws detuned and beating against each other, through a slow LFO on
// the low-pass cutoff and saturation — the snarling, moving D&B/dubstep bass.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthReese(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 36, len = Math.floor(sr * clamp(p.length ?? 2, 0.3, 8));
  const detune = clamp((p.detune ?? 18) / 100, 0, 1);
  const cutoff = p.cutoff ?? 800, reso = clamp(p.reso ?? 0.55, 0, 0.92), amount = clamp((p.amount ?? 60) / 100, 0, 1);
  const lfoRate = clamp(p.lfoRate ?? 0.4, 0.05, 6), drive = clamp(p.drive ?? 0.5, 0, 1);
  const f0 = noteHz(note), f1 = f0 * Math.pow(2, detune / 12), f2 = f0 / Math.pow(2, detune / 12);
  const out = new Float32Array(len); let ph1 = 0, ph2 = 0, low = 0, band = 0;
  const attack = Math.floor(sr * 0.01), release = Math.floor(sr * 0.1);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    ph1 += (2 * Math.PI * f1) / sr; ph2 += (2 * Math.PI * f2) / sr;
    const s = (2 * ((ph1 / (2 * Math.PI)) % 1) - 1) + (2 * ((ph2 / (2 * Math.PI)) % 1) - 1);
    const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * lfoRate * t);
    const fc = clamp(cutoff + lfo * amount * 2500, 80, sr * 0.45), q = 1 - reso, ff = 2 * Math.sin((Math.PI * fc) / sr);
    const high = s - low - q * band; band += ff * high; low += ff * band;
    let env = 1; if (i < attack) env = i / attack; else if (i > len - release) env = Math.max(0, (len - i) / release);
    out[i] = Math.tanh(low * env * (1 + drive * 3.5)) * 0.7;
  }
  return norm(out);
}
