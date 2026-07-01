// Chord-stab synthesis (pure JS). A stack of (lightly detuned) saws for a chord through a resonant
// low-pass with a fast filter envelope and drive — short, punchy synth stabs.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }
const CHORDS: Record<string, number[]> = { single:[0], maj:[0,4,7], min:[0,3,7], maj7:[0,4,7,11], min7:[0,3,7,10], dom7:[0,4,7,10], sus4:[0,5,7], min9:[0,3,7,10,14] };

export function synthStab(p: any = {}, sr = 44100): Float32Array {
  const root = p.note ?? 48, chord = CHORDS[p.chord] || CHORDS.min7;
  const len = Math.floor(sr * clamp(p.length ?? 0.6, 0.1, 3));
  const decay = Math.max(0.03, p.decay ?? 0.35), cutoff = p.cutoff ?? 2000, reso = clamp(p.reso ?? 0.5, 0, 0.92);
  const envMod = (p.envMod ?? 70) / 100, drive = clamp(p.drive ?? 0.3, 0, 1);
  const oscs: { f: number; ph: number }[] = [];
  for (const semi of chord) { const f = noteHz(root + semi); oscs.push({ f, ph: 0 }); oscs.push({ f: f * Math.pow(2, 0.08 / 12), ph: Math.random() * 6.28 }); }
  const out = new Float32Array(len); let low = 0, band = 0;
  const atk = Math.floor(sr * 0.004);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let s = 0; for (const o of oscs) { o.ph += (2 * Math.PI * o.f) / sr; s += 2 * ((o.ph / (2 * Math.PI)) % 1) - 1; }
    s /= oscs.length;
    const env = Math.exp(-t / decay);
    const fc = clamp(cutoff * (1 + envMod * env * 2), 80, sr * 0.45), q = 1 - reso, f = 2 * Math.sin((Math.PI * fc) / sr);
    const high = s - low - q * band; band += f * high; low += f * band;
    const amp = (i < atk ? i / atk : 1) * env;
    out[i] = Math.tanh(low * amp * (1 + drive * 3));
  }
  return norm(out);
}
export { CHORDS as STAB_CHORDS };
