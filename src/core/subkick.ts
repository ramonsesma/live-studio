// Sub Kick (pure JS). A pure-sine sub layer tuned to a kick's fundamental with a fast pitch dip
// and a smooth decay — meant to LAYER under Drum Synth's kick for extra low-end weight, not
// replace it (no click/transient of its own).
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthSubKick(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 24, decay = Math.max(0.1, p.decay ?? 0.5), dip = clamp(p.dip ?? 8, 0, 24);
  const dipTime = Math.max(0.005, p.dipTime ?? 0.06), drive = clamp(p.drive ?? 0.2, 0, 1);
  const len = Math.floor(sr * clamp(p.length ?? decay * 1.6 + 0.05, 0.2, 3));
  const f0 = noteHz(note), fStart = f0 * Math.pow(2, dip / 12);
  const out = new Float32Array(len); let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const f = f0 + (fStart - f0) * Math.exp(-t / dipTime);
    ph += (2 * Math.PI * f) / sr;
    const env = Math.exp(-t / decay);
    out[i] = Math.tanh(Math.sin(ph) * env * (1 + drive * 2));
  }
  return norm(out);
}
