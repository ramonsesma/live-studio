// Glass Bell (pure JS). FM-ish additive bell built from high, non-integer partials for a
// crystalline "glass" timbre — brighter and colder than the FM Bell (tine/e-piano relative).
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthGlassBell(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 72, decay = Math.max(0.3, p.decay ?? 2.2);
  const shimmer = clamp(p.shimmer ?? 0.6, 0, 1), len = Math.floor(sr * clamp(p.length ?? decay * 1.2 + 0.05, 0.3, 8));
  const f = noteHz(note), out = new Float32Array(len);
  const ratios = [1, 2.76, 4.18, 5.93, 7.15, 9.02]; // inharmonic glass-like ratios
  const phs = ratios.map(() => 0);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let s = 0;
    ratios.forEach((r, k) => { phs[k] += (2 * Math.PI * f * r) / sr; const amt = k === 0 ? 1 : shimmer / (k + 0.6); const dk = decay / (1 + k * 0.4); s += Math.sin(phs[k]) * amt * Math.exp(-t / Math.max(0.15, dk)); });
    if (t < 0.002) s += (Math.random() * 2 - 1) * 0.4 * (1 - t / 0.002);
    out[i] = s;
  }
  return norm(out);
}
