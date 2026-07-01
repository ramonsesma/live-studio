// Tonal sub-bass synthesis (pure JS). A sustained sine with controllable upper harmonics (so it
// reads on small speakers), gentle drive and an attack/release envelope — a held bass note,
// distinct from the 808 one-shot.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthSubBass(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 28, len = Math.floor(sr * clamp(p.length ?? 1.5, 0.2, 8));
  const harm = clamp((p.harmonics ?? 30) / 100, 0, 1), drive = clamp(p.drive ?? 0.3, 0, 1), glide = clamp(p.glide ?? 0, 0, 24);
  const attack = Math.max(0.001, p.attack ?? 0.01) * sr, release = Math.max(0.01, p.release ?? 0.1) * sr;
  const f0 = noteHz(note), fStart = f0 * Math.pow(2, glide / 12);
  const out = new Float32Array(len); let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const f = f0 + (fStart - f0) * Math.exp(-t / 0.05); ph += (2 * Math.PI * f) / sr;
    let s = Math.sin(ph) + harm * 0.5 * Math.sin(2 * ph) + harm * 0.22 * Math.sin(3 * ph);
    s = Math.tanh(s * (1 + drive * 3)) / (1 + drive);
    let env = 1; if (i < attack) env = i / attack; else if (i > len - release) env = Math.max(0, (len - i) / release);
    out[i] = s * env;
  }
  return norm(out);
}
