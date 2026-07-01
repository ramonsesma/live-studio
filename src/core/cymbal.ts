// Cymbal (crash / ride / china) (pure JS). Layered metallic high partials + bright noise +
// long decay. Type picks the partial spread and decay length.
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthCymbal(p: any = {}, sr = 44100): Float32Array {
  const type = ["crash", "ride", "china"].includes(p.type) ? p.type : "crash";
  const decay = Math.max(0.2, p.decay ?? (type === "crash" ? 2.2 : type === "ride" ? 1.6 : 1.4));
  const bright = clamp(p.brightness ?? 0.6, 0, 1), strike = clamp((p.strike ?? 50) / 100, 0, 1);
  const len = Math.floor(sr * clamp(p.length ?? decay * 1.2, 0.3, 6));
  const out = new Float32Array(len);
  // partial frequencies per type
  const partials = type === "ride" ? [600, 1100, 1800, 2700, 3600, 5200, 7400]
    : type === "china" ? [800, 1500, 2200, 3300, 5000, 6800, 9000]
    : [700, 1300, 2100, 3000, 4400, 6200, 8500];
  const phs = partials.map(() => 0), gains = partials.map((_, i) => 1 / (1 + i * 0.3));
  let hpPrev = 0, hpY = 0;
  const hpA = Math.exp(-2 * Math.PI * (4000 + bright * 4000) / sr);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let metal = 0; for (let k = 0; k < partials.length; k++) { phs[k] += (2 * Math.PI * partials[k]) / sr; metal += Math.sign(Math.sin(phs[k])) * gains[k]; }
    metal /= partials.length;
    const w = Math.random() * 2 - 1; hpY = hpA * (hpY + w - hpPrev); hpPrev = w;
    const noise = hpY * (0.5 + bright * 0.6);
    let s = (metal * 0.5 + noise * 0.7) * Math.exp(-t / decay);
    if (t < 0.01) s += (Math.random() * 2 - 1) * strike * (1 - t / 0.01);
    out[i] = s;
  }
  return norm(out);
}
