// Plucked-string synthesis (pure JS) via Karplus-Strong: a noise burst fed into a delay line of
// length sr/freq with a low-pass feedback. Strums a chord by staggering the plucked notes.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.93 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }
const CHORDS: Record<string, number[]> = { single:[0], maj:[0,4,7], min:[0,3,7], maj7:[0,4,7,11], min7:[0,3,7,10], sus2:[0,2,7], sus4:[0,5,7], oct:[0,12] };

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

export function synthPluck(p: any = {}, sr = 44100): Float32Array {
  const root = p.note ?? 48;
  const chord = CHORDS[p.chord] || CHORDS.min7;
  const durS = Math.floor(sr * clamp(p.length ?? 2, 0.3, 8));
  const out = new Float32Array(durS);
  const strum = clamp(p.strum ?? 25, 0, 200) / 1000;
  const damping = clamp(p.damping ?? 0.5, 0, 0.95);
  const bright = clamp(p.brightness ?? 0.5, 0, 1);
  chord.forEach((semi: number, ci: number) => {
    const f = noteHz(root + semi), off = Math.floor(ci * strum * sr);
    const v = ks(f, sr, durS - off, damping, bright);
    for (let i = 0; i < v.length; i++) out[off + i] += v[i] * 0.7;
  });
  return norm(out);
}
export { CHORDS as PLUCK_CHORDS };
