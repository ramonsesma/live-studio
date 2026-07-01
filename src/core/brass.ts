// Synth brass section (pure JS). A stacked saw chord through a resonant low-pass with a slow
// attack filter envelope and vibrato — punchy synth-brass stabs and held chords.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }
const CHORDS: Record<string, number[]> = { single:[0], maj:[0,4,7], min:[0,3,7], maj7:[0,4,7,11], dom7:[0,4,7,10] };

export function synthBrass(p: any = {}, sr = 44100): Float32Array {
  const root = p.note ?? 55, chord = CHORDS[p.chord] || CHORDS.single, octaves = clamp(p.octaves ?? 2, 1, 3);
  const len = Math.floor(sr * clamp(p.length ?? 1.2, 0.2, 6));
  const attack = Math.max(0.005, p.attack ?? 0.08) * sr, release = Math.max(0.05, p.release ?? 0.2) * sr;
  const cutoff = p.cutoff ?? 1800, reso = clamp(p.reso ?? 0.4, 0, 0.9), envMod = clamp((p.envMod ?? 60) / 100, 0, 1);
  const vib = clamp((p.vibrato ?? 25) / 100, 0, 1), drive = clamp(p.drive ?? 0.3, 0, 1);
  const phs: number[][] = chord.map(() => Array.from({ length: octaves * 2 }, () => Math.random() * 6.28));
  const out = new Float32Array(len); let low = 0, band = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr, vmod = 1 + vib * 0.008 * Math.sin(2 * Math.PI * 5 * t);
    let s = 0;
    chord.forEach((semi, ci) => { for (let o = 0; o < octaves; o++) { const f = noteHz(root + semi + o * 12) * vmod; phs[ci][o * 2] += (2 * Math.PI * f) / sr; phs[ci][o * 2 + 1] += (2 * Math.PI * f * 1.005) / sr; s += (2 * ((phs[ci][o * 2] / (2 * Math.PI)) % 1) - 1) + (2 * ((phs[ci][o * 2 + 1] / (2 * Math.PI)) % 1) - 1); } });
    s /= chord.length * octaves * 4;
    const fenv = i < sr * 0.15 ? i / (sr * 0.15) : 1;
    const fc = clamp(cutoff * (1 + envMod * fenv), 200, sr * 0.45), q = 1 - reso, f = 2 * Math.sin((Math.PI * fc) / sr);
    const high = s - low - q * band; band += f * high; low += f * band;
    let env = 1; if (i < attack) env = i / attack; else if (i > len - release) env = Math.max(0, (len - i) / release);
    out[i] = Math.tanh(low * env * (1 + drive * 2));
  }
  return norm(out);
}
export { CHORDS as BRASS_CHORDS };
