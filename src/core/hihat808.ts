// 808-style Hi-Hat (pure JS). Six square-wave metallic partials (classic 808 hat ratios) summed
// and high-passed, with separate closed/open decay times.
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }
const RATIOS = [1, 1.342, 1.63, 2.05, 2.42, 2.83];

export function synthHiHat808(p: any = {}, sr = 44100): Float32Array {
  const open = !!p.open, decay = Math.max(0.02, p.decay ?? (open ? 0.5 : 0.09));
  const tone = p.tone ?? 320, len = Math.floor(sr * clamp(p.length ?? decay * 1.5 + 0.02, 0.05, 2));
  const metallic = clamp((p.metallic ?? 70) / 100, 0, 1);
  const out = new Float32Array(len);
  const phs = RATIOS.map(() => 0);
  let hpPrev = 0, hpY = 0; const hpA = Math.exp(-2 * Math.PI * 6500 / sr);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let metal = 0; RATIOS.forEach((r, k) => { phs[k] += (2 * Math.PI * tone * r) / sr; metal += Math.sign(Math.sin(phs[k])); });
    metal /= RATIOS.length;
    const n = (Math.random() * 2 - 1) * (1 - metallic) + metal * metallic;
    hpY = hpA * (hpY + n - hpPrev); hpPrev = n;
    out[i] = hpY * Math.exp(-t / decay);
  }
  return norm(out);
}
