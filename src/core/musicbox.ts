// Music Box (pure JS). A sine with metallic odd inharmonic partials + very fast decay — the
// tinkling tine of a music box. Brighter and more inharmonic than the marimba.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthMusicBox(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 72, decay = Math.max(0.2, p.decay ?? 1.2);
  const bright = clamp(p.brightness ?? 0.5, 0, 1), tine = clamp(p.tine ?? 0.5, 0, 1);
  const len = Math.floor(sr * clamp(p.length ?? decay * 1.3 + 0.05, 0.3, 6));
  const f = noteHz(note), out = new Float32Array(len);
  let p1 = 0, p3 = 0, p5 = 0, p7 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    p1 += (2 * Math.PI * f) / sr; p3 += (2 * Math.PI * f * 2.76) / sr; p5 += (2 * Math.PI * f * 5.4) / sr; p7 += (2 * Math.PI * f * 8.93) / sr;
    let s = Math.sin(p1) + bright * 0.45 * Math.sin(p3) * Math.exp(-t / (decay * 0.5)) + bright * 0.25 * Math.sin(p5) * Math.exp(-t / (decay * 0.3)) + bright * 0.15 * Math.sin(p7) * Math.exp(-t / (decay * 0.15));
    if (t < 0.004) s += (Math.random() * 2 - 1) * tine * 0.5 * (1 - t / 0.004);
    out[i] = s * Math.exp(-t / decay);
  }
  return norm(out);
}
