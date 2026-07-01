// Sub-drop / downlifter (pure JS). A sine glides down N semitones over `length`, with optional
// noise crack at the start and a sub layer — the classic transition drop.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthSubDrop(p: any = {}, sr = 44100): Float32Array {
  const startNote = p.startNote ?? 48, endNote = p.endNote ?? 24, len = Math.floor(sr * clamp(p.length ?? 2, 0.3, 8));
  const f0 = noteHz(startNote), f1 = noteHz(endNote), drive = clamp(p.drive ?? 0.3, 0, 1);
  const click = clamp((p.click ?? 30) / 100, 0, 1), sub = clamp((p.sub ?? 50) / 100, 0, 1);
  const out = new Float32Array(len); let ph = 0, phS = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const f = f0 * Math.pow(f1 / f0, t); ph += (2 * Math.PI * f) / sr; phS += (2 * Math.PI * f * 0.5) / sr;
    let s = Math.sin(ph) + sub * Math.sin(phS);
    if (i < sr * 0.01) s += (Math.random() * 2 - 1) * click;
    s = Math.tanh(s * (1 + drive * 3));
    const env = Math.pow(1 - t, 0.6) * (p.fade !== false ? Math.min(1, t * 100) : 1);
    out[i] = s * env;
  }
  return norm(out);
}
