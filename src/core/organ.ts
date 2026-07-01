// Additive (drawbar) organ synthesis (pure JS). Sums sine harmonics at Hammond drawbar ratios per
// chord note, with an optional percussion click, vibrato and a sustained envelope.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.93 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }
const CHORDS: Record<string, number[]> = { single:[0], maj:[0,4,7], min:[0,3,7], maj7:[0,4,7,11], min7:[0,3,7,10], dom7:[0,4,7,10], sus4:[0,5,7] };
// Hammond drawbar harmonic ratios (16', 5⅓', 8', 4', 2⅔', 2', 1⅗', 1⅓', 1').
const RATIOS = [0.5, 1.5, 1, 2, 3, 4, 5, 6, 8];
const PRESETS: Record<string, number[]> = {
  full: [0.9, 0.7, 1, 0.8, 0.5, 0.6, 0.3, 0.2, 0.4],
  jazz: [0.8, 0, 1, 0.6, 0, 0.4, 0, 0, 0.3],
  rock: [1, 0.8, 1, 1, 0.6, 0.8, 0.4, 0.3, 0.6],
  mellow: [1, 0.4, 0.8, 0.3, 0, 0.2, 0, 0, 0],
};

export function synthOrgan(p: any = {}, sr = 44100): Float32Array {
  const root = p.note ?? 48, chord = CHORDS[p.chord] || CHORDS.maj;
  const bars = PRESETS[p.registration] || PRESETS.full;
  const len = Math.floor(sr * clamp(p.length ?? 2, 0.2, 8));
  const vib = clamp((p.vibrato ?? 30) / 100, 0, 1), perc = clamp((p.percussion ?? 40) / 100, 0, 1), drive = clamp(p.drive ?? 0.1, 0, 1);
  const phs: number[][] = chord.map(() => RATIOS.map(() => 0));
  const out = new Float32Array(len);
  const atk = Math.floor(sr * 0.006), rel = Math.floor(sr * 0.08);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const vmod = 1 + vib * 0.006 * Math.sin(2 * Math.PI * 6 * t);
    let s = 0;
    chord.forEach((semi, ci) => { const f = noteHz(root + semi) * vmod; for (let h = 0; h < RATIOS.length; h++) { phs[ci][h] += (2 * Math.PI * f * RATIOS[h]) / sr; s += Math.sin(phs[ci][h]) * bars[h]; } });
    s /= chord.length * 3;
    if (perc > 0 && t < 0.25) s += Math.sin(phs[0][3]) * perc * Math.exp(-t / 0.08) * 0.6;
    let env = 1; if (i < atk) env = i / atk; else if (i > len - rel) env = Math.max(0, (len - i) / rel);
    out[i] = Math.tanh(s * (1 + drive * 2)) * env;
  }
  return norm(out);
}
export { CHORDS as ORGAN_CHORDS };
