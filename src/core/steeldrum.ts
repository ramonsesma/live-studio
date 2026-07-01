// Steel Drum / Pan (pure JS). Sine fundamental + steel-pan-characteristic inharmonic partials
// (ratios distinct from marimba's wood-bar set) + a soft mallet click.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthSteelDrum(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 64, decay = Math.max(0.2, p.decay ?? 1.1);
  const bright = clamp(p.brightness ?? 0.5, 0, 1), hit = clamp((p.hit ?? 40) / 100, 0, 1);
  const len = Math.floor(sr * clamp(p.length ?? decay * 1.4 + 0.05, 0.3, 6));
  const f = noteHz(note), out = new Float32Array(len);
  const ratios = [1, 2.0, 2.9, 3.8, 4.6]; // steel-pan-ish overtone spread
  const phs = ratios.map(() => 0);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let s = 0;
    ratios.forEach((r, k) => { phs[k] += (2 * Math.PI * f * r) / sr; const decK = decay * (1 - k * 0.15); s += Math.sin(phs[k]) * (k === 0 ? 1 : bright * 0.5 / (k + 1)) * Math.exp(-t / Math.max(0.1, decK)); });
    if (t < 0.004) s += (Math.random() * 2 - 1) * hit * (1 - t / 0.004);
    out[i] = s;
  }
  return norm(out);
}
