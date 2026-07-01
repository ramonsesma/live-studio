// Pluck Bass (pure JS). A short Karplus-Strong string at bass register + filtered sub layer +
// drive — punchy bass guitar / finger pluck for basslines.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

function ks(freq: number, sr: number, durSamples: number, damping: number, bright: number): Float32Array {
  const N = Math.max(2, Math.round(sr / freq));
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = Math.random() * 2 - 1;
  const out = new Float32Array(durSamples);
  const fb = 0.985 + (1 - damping) * 0.014;
  let idx = 0;
  for (let i = 0; i < durSamples; i++) {
    const cur = buf[idx], next = buf[(idx + 1) % N];
    const avg = (cur + next) * 0.5;
    buf[idx] = ((1 - bright) * avg + bright * cur) * fb;
    out[i] = cur;
    idx = (idx + 1) % N;
  }
  return out;
}

export function synthPluckBass(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 36, dur = clamp(p.length ?? 0.6, 0.1, 4);
  const len = Math.floor(sr * dur);
  const damp = clamp(p.damping ?? 0.55, 0.1, 0.95), bright = clamp(p.brightness ?? 0.35, 0, 1);
  const sub = clamp((p.sub ?? 60) / 100, 0, 1), drive = clamp(p.drive ?? 0.35, 0, 1);
  const f = noteHz(note);
  const pluck = ks(f, sr, len, damp, bright);
  const out = new Float32Array(len); let phSub = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr; phSub += (2 * Math.PI * f * 0.5) / sr;
    const subS = Math.sin(phSub) * Math.exp(-t / Math.max(0.1, dur * 0.6));
    out[i] = Math.tanh((pluck[i] + subS * sub) * (1 + drive * 3));
  }
  return norm(out);
}
