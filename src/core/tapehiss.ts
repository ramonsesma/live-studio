// Tape hiss / lo-fi noise bed (pure JS). Pink-ish band-limited noise + slow wow/flutter + crackle
// pops — a vinyl/tape texture layer for lo-fi production.
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.93 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthTapeHiss(p: any = {}, sr = 44100): Float32Array {
  const len = Math.floor(sr * clamp(p.length ?? 4, 0.5, 16));
  const tone = clamp(p.tone ?? 0.5, 0, 1), wow = clamp((p.wow ?? 35) / 100, 0, 1), crackle = clamp((p.crackle ?? 25) / 100, 0, 1);
  const pink = [0, 0, 0, 0, 0, 0, 0]; let brown = 0;
  const out = new Float32Array(len); let lp = 0, hp = 0;
  const lpA = 0.05 + (1 - tone) * 0.5, hpA = 0.92 + tone * 0.07;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const white = Math.random() * 2 - 1;
    pink[0] = 0.99886 * pink[0] + white * 0.0555179; pink[1] = 0.99332 * pink[1] + white * 0.0750759; pink[2] = 0.96900 * pink[2] + white * 0.1538520; pink[3] = 0.86650 * pink[3] + white * 0.3104856; pink[4] = 0.55000 * pink[4] + white * 0.5329522; pink[5] = -0.7616 * pink[5] - white * 0.0168980;
    let n = (pink[0] + pink[1] + pink[2] + pink[3] + pink[4] + pink[5] + pink[6] + white * 0.5362) * 0.11; pink[6] = white * 0.115926;
    brown = (brown + 0.02 * white) / 1.02; n += brown * 2 * (1 - tone);
    lp += lpA * (n - lp); n = lp; hp = hpA * (hp + lp - n); n = lp - hp;
    // wow & flutter: slow tremolo on amplitude
    const mod = 1 + wow * 0.18 * Math.sin(2 * Math.PI * (0.6 + 0.3 * Math.sin(2 * Math.PI * 0.05 * t)) * t);
    let s = n * 0.35 * mod;
    if (crackle > 0 && Math.random() < crackle * 0.002) s += (Math.random() * 2 - 1) * 0.7;
    out[i] = s;
  }
  return norm(out);
}
