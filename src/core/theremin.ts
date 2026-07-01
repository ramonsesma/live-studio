// Theremin (pure JS). A pure sine with continuous pitch glide (portamento) between start and
// end note plus a wide, slow vibrato and a smooth fade in/out — no attack transient at all.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthTheremin(p: any = {}, sr = 44100): Float32Array {
  const startNote = p.note ?? 72, endNote = p.endNote ?? startNote;
  const len = Math.floor(sr * clamp(p.length ?? 1.5, 0.3, 8));
  const vib = clamp((p.vibrato ?? 45) / 100, 0, 1), vibRate = clamp(p.vibratoRate ?? 5.5, 1, 9);
  const glideTime = Math.max(0.05, p.glideTime ?? 0.4);
  const f0 = noteHz(startNote), f1 = noteHz(endNote);
  const out = new Float32Array(len); let ph = 0;
  const fadeIn = Math.floor(sr * 0.15), fadeOut = Math.floor(sr * 0.2);
  for (let i = 0; i < len; i++) {
    const t = i / sr, gt = clamp(t / glideTime, 0, 1);
    const f = f0 + (f1 - f0) * gt;
    const vmod = 1 + vib * 0.02 * Math.sin(2 * Math.PI * vibRate * t);
    ph += (2 * Math.PI * f * vmod) / sr;
    let env = 1; if (i < fadeIn) env = i / fadeIn; else if (i > len - fadeOut) env = Math.max(0, (len - i) / fadeOut);
    out[i] = Math.sin(ph) * env;
  }
  return norm(out);
}
