// Vocoder / Talkbox (pure JS). A pitched saw "carrier" shaped by gated formant filters that
// switch between vowels per step — synthetic vocoder words at a tempo.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }
const VOWELS: [number, number, number][] = [
  [800, 1150, 2900], // a
  [400, 1700, 2600], // e
  [300, 2300, 3000], // i
  [500, 800, 2830],  // o
  [325, 700, 2700],  // u
];

export function synthVocoder(p: any = {}, sr = 44100): Float32Array {
  const root = p.note ?? 60, bpm = clamp(p.bpm ?? 120, 60, 200), bars = Math.round(clamp(p.bars ?? 1, 1, 4));
  const stepN = Math.floor((60 / bpm) * 0.5 * sr), steps = bars * 16, len = stepN * steps;
  const PITCHES = [0, 0, 5, 7, 0, 3, 7, 12, 0, 0, 5, 7, 3, 0, 7, 0];
  const GATE = [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1];
  const drive = clamp(p.drive ?? 0.4, 0, 1);
  const out = new Float32Array(len); let ph = 0;
  const bp = Array.from({ length: 3 }, () => ({ low: 0, band: 0 }));
  for (let i = 0; i < len; i++) {
    const t = i / sr, step = Math.floor(i / stepN), inStep = (i % stepN) / sr, idx = step % 16;
    const F = VOWELS[step % VOWELS.length];
    const f = noteHz(root + PITCHES[idx]);
    ph += (2 * Math.PI * f) / sr;
    const saw = 2 * ((ph / (2 * Math.PI)) % 1) - 1;
    let s = 0;
    for (let k = 0; k < 3; k++) { const fc = F[k], q = 0.07, ff = 2 * Math.sin((Math.PI * Math.min(sr * 0.45, fc)) / sr); const high = saw - bp[k].low - q * bp[k].band; bp[k].band += ff * high; bp[k].low += ff * bp[k].band; s += bp[k].band * (k === 0 ? 1 : k === 1 ? 0.7 : 0.4); }
    const gate = GATE[idx] ? Math.min(1, inStep / 0.005) * Math.exp(-Math.max(0, inStep - (stepN / sr) * 0.65) / 0.03) : 0;
    out[i] = Math.tanh(s * gate * (1 + drive * 2));
  }
  return norm(out);
}
