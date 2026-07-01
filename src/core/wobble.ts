// Wobble / growl bass synthesis (pure JS). A saw stack through a low-pass whose cutoff is
// modulated by a tempo-synced LFO — the dubstep wobble. Drive + sub layer for weight.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthWobble(p: any = {}, sr = 44100): Float32Array {
  const root = p.note ?? 36, bpm = clamp(p.bpm ?? 140, 60, 220), bars = Math.round(clamp(p.bars ?? 1, 1, 4));
  const len = Math.floor((60 / bpm) * 4 * bars * sr);
  const wobbleHz = bpm / 60 / (p.rate || 0.5); // 0.5 = 1/8 wobble
  const cutBase = p.cutoff ?? 600, cutAmt = clamp((p.amount ?? 80) / 100, 0, 1), reso = clamp(p.reso ?? 0.75, 0, 0.92);
  const drive = clamp(p.drive ?? 0.6, 0, 1), sub = clamp((p.sub ?? 40) / 100, 0, 1);
  const f0 = noteHz(root), out = new Float32Array(len); let ph1 = 0, ph2 = 0, phSub = 0, low = 0, band = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    ph1 += (2 * Math.PI * f0) / sr; ph2 += (2 * Math.PI * f0 * 1.005) / sr; phSub += (2 * Math.PI * f0 * 0.5) / sr;
    const saw = (2 * ((ph1 / (2 * Math.PI)) % 1) - 1) + (2 * ((ph2 / (2 * Math.PI)) % 1) - 1);
    const subS = Math.sin(phSub);
    const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * wobbleHz * t);
    const fc = clamp(cutBase + lfo * cutAmt * 3500, 80, sr * 0.45), q = 1 - reso, f = 2 * Math.sin((Math.PI * fc) / sr);
    const high = saw - low - q * band; band += f * high; low += f * band;
    out[i] = Math.tanh((low + subS * sub) * (1 + drive * 4)) * 0.8;
  }
  return norm(out);
}
