// Sitar (pure JS). Karplus-Strong main string + a nonlinear "buzz" (soft clip against a
// threshold, emulating the jawari bridge buzz) + sympathetic-string shimmer (short high partials).
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthSitar(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 60, dur = clamp(p.length ?? 2, 0.3, 8), buzz = clamp((p.buzz ?? 60) / 100, 0, 1);
  const damp = clamp(p.damping ?? 0.3, 0.05, 0.9), sympathetic = clamp((p.sympathetic ?? 40) / 100, 0, 1);
  const f = noteHz(note), N = Math.max(2, Math.round(sr / f));
  const buf = new Float32Array(N); for (let i = 0; i < N; i++) buf[i] = Math.random() * 2 - 1;
  const fb = 0.988 + (1 - damp) * 0.011;
  const len = Math.floor(sr * dur), out = new Float32Array(len);
  let idx = 0, p2 = 0, p3 = 0;
  const thresh = 0.35 - buzz * 0.25;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const cur = buf[idx], next = buf[(idx + 1) % N];
    buf[idx] = ((cur + next) * 0.5) * fb;
    let s = cur;
    // buzz: soft-clip against a threshold to emulate the bridge buzz
    if (Math.abs(s) < thresh) s *= 1 + buzz * 1.5; else s = Math.sign(s) * (thresh + (Math.abs(s) - thresh) * 0.3);
    p2 += (2 * Math.PI * f * 2.01) / sr; p3 += (2 * Math.PI * f * 3.02) / sr;
    s += sympathetic * 0.15 * Math.sin(p2) * Math.exp(-t / (dur * 0.3)) + sympathetic * 0.1 * Math.sin(p3) * Math.exp(-t / (dur * 0.2));
    out[i] = s;
    idx = (idx + 1) % N;
  }
  return norm(out);
}
