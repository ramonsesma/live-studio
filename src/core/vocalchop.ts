// Synthetic vocal-chop synthesis (pure JS). A sawtooth glottal source through three band-pass
// formant filters (a/e/i/o/u vowels) gated into rhythmic steps with a melodic pitch pattern and
// vibrato — the chopped "ahh-eee" vocal texture, with no sample needed.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }
const FORMANTS: Record<string, [number, number, number]> = { a:[800,1150,2900], e:[400,1700,2600], i:[300,2300,3000], o:[500,800,2830], u:[325,700,2700] };
const PITCHES = [0, 0, 7, 5, 0, 3, 7, 12, 0, 0, 5, 7, 3, 0, 7, 0];
const GATE = [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1];

export function synthVocalChop(p: any = {}, sr = 44100): Float32Array {
  const root = p.note ?? 60, vowel = FORMANTS[p.vowel] ? p.vowel : "a";
  const F = FORMANTS[vowel], bpm = clamp(p.bpm ?? 120, 60, 200), bars = Math.round(clamp(p.bars ?? 1, 1, 4));
  const stepN = Math.floor((60 / bpm) * 0.5 * sr), steps = bars * 16, len = stepN * steps; // 1/8 steps
  const vib = clamp((p.vibrato ?? 35) / 100, 0, 1), bw = clamp(p.brightness ?? 0.5, 0, 1);
  const out = new Float32Array(len); let ph = 0;
  const bp = [0, 0, 0].map(() => ({ low: 0, band: 0 }));
  for (let i = 0; i < len; i++) {
    const t = i / sr, step = Math.floor(i / stepN), inStep = (i % stepN) / sr, idx = step % 16;
    const vmod = 1 + vib * 0.012 * Math.sin(2 * Math.PI * 5.5 * t);
    const f = noteHz(root + PITCHES[idx]) * vmod;
    ph += (2 * Math.PI * f) / sr;
    const saw = 2 * ((ph / (2 * Math.PI)) % 1) - 1;
    let s = 0;
    for (let k = 0; k < 3; k++) { const fc = F[k]; const q = 0.08 + bw * 0.06; const ff = 2 * Math.sin((Math.PI * Math.min(sr * 0.45, fc)) / sr); const high = saw - bp[k].low - q * bp[k].band; bp[k].band += ff * high; bp[k].low += ff * bp[k].band; s += bp[k].band * (k === 0 ? 1 : k === 1 ? 0.7 : 0.4); }
    const gate = GATE[idx] ? Math.min(1, inStep / 0.006) * Math.exp(-Math.max(0, inStep - (stepN / sr) * 0.6) / 0.04) : 0;
    out[i] = s * gate;
  }
  return norm(out);
}
export { FORMANTS as VOWELS };
