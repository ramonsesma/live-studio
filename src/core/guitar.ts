// Distorted Guitar (pure JS). Karplus-Strong string(s) through hard clipping distortion + a
// resonant low-pass for cabinet-like tone. Supports a power-chord (root+5th+octave).
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }
const CHORDS: Record<string, number[]> = { single:[0], power:[0,7,12], power5:[0,7] };

function ks(freq: number, sr: number, dur: number, damp: number): Float32Array {
  const N = Math.max(2, Math.round(sr / freq));
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = Math.random() * 2 - 1;
  const fb = 0.978 + (1 - damp) * 0.02;
  const out = new Float32Array(Math.floor(sr * dur));
  let idx = 0;
  for (let i = 0; i < out.length; i++) { const cur = buf[idx], next = buf[(idx + 1) % N]; buf[idx] = ((cur + next) * 0.5) * fb; out[i] = cur; idx = (idx + 1) % N; }
  return out;
}

export function synthGuitar(p: any = {}, sr = 44100): Float32Array {
  const root = p.note ?? 40, chord = CHORDS[p.chord] || CHORDS.power;
  const dur = clamp(p.length ?? 0.8, 0.1, 4), damp = clamp(p.sustain ?? 0.55, 0.05, 0.95);
  const drive = clamp(p.drive ?? 0.7, 0, 1), cutoff = p.cutoff ?? 2500, palmMute = clamp((p.palmMute ?? 0) / 100, 0, 1);
  const out = new Float32Array(Math.floor(sr * dur));
  chord.forEach((semi: number) => { const v = ks(noteHz(root + semi), sr, dur, damp); for (let i = 0; i < v.length; i++) out[i] += v[i] * 0.6; });
  let low = 0, band = 0;
  const q = 0.5, f = 2 * Math.sin((Math.PI * clamp(cutoff, 200, sr * 0.45)) / sr);
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const high = out[i] - low - q * band; band += f * high; low += f * band;
    let s = Math.tanh(low * (1 + drive * 8));
    if (palmMute > 0) s *= Math.exp(-t / (dur * (1 - palmMute * 0.85)));
    out[i] = s;
  }
  return norm(out);
}
