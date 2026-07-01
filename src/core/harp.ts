// Plucked Harp / glissando (pure JS). Karplus-Strong tuned long, brighter than the basic Pluck,
// with longer sustain; can strum a chord. Distinct timbre from Pluck (more shimmery).
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }
const CHORDS: Record<string, number[]> = { single:[0], maj:[0,4,7,12], min:[0,3,7,12], maj7:[0,4,7,11,14], min7:[0,3,7,10,14], gliss:[0,2,4,5,7,9,11,12] };

function ksLong(freq: number, sr: number, dur: number, damp: number, bright: number): Float32Array {
  const N = Math.max(2, Math.round(sr / freq));
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = (Math.random() * 2 - 1) * 0.7;
  // soft initial low-pass for a less harsh attack
  for (let i = 1; i < N; i++) buf[i] = 0.5 * buf[i] + 0.5 * buf[i - 1];
  const fb = 0.992 + (1 - damp) * 0.007;
  const out = new Float32Array(Math.floor(sr * dur));
  let idx = 0;
  for (let i = 0; i < out.length; i++) {
    const cur = buf[idx], next = buf[(idx + 1) % N];
    const avg = (cur + next) * 0.5;
    buf[idx] = ((1 - bright * 0.5) * avg + bright * 0.5 * cur) * fb;
    out[i] = cur;
    idx = (idx + 1) % N;
  }
  return out;
}

export function synthHarp(p: any = {}, sr = 44100): Float32Array {
  const root = p.note ?? 60, chord = CHORDS[p.chord] || CHORDS.maj;
  const dur = clamp(p.length ?? 3, 0.5, 10), strum = clamp((p.strum ?? 35) / 1000, 0, 0.3);
  const damp = clamp(p.damping ?? 0.25, 0.05, 0.9), bright = clamp(p.brightness ?? 0.55, 0, 1);
  const out = new Float32Array(Math.floor(sr * dur));
  chord.forEach((semi: number, ci: number) => {
    const f = noteHz(root + semi), off = Math.floor(ci * strum * sr);
    const v = ksLong(f, sr, dur - off / sr, damp, bright);
    for (let i = 0; i < v.length; i++) out[off + i] += v[i] * 0.6;
  });
  return norm(out);
}
export { CHORDS as HARP_CHORDS };
