// Synthetic choir / "aah" pad (pure JS). A stack of mildly-detuned saws per chord-note, through
// vocal formant band-passes (a/o/u vowels), with slow attack and chorus — vocal-style pad.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.93 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }
const CHORDS: Record<string, number[]> = { single:[0], maj:[0,4,7], min:[0,3,7], maj7:[0,4,7,11], min7:[0,3,7,10] };
const VOWELS: Record<string, [number, number, number]> = { a:[800,1150,2900], o:[500,800,2830], u:[325,700,2700], aa:[700,1300,2600] };

export function synthChoir(p: any = {}, sr = 44100): Float32Array {
  const root = p.note ?? 60, chord = CHORDS[p.chord] || CHORDS.maj, F = VOWELS[p.vowel] || VOWELS.a;
  const voices = clamp(p.voices ?? 3, 1, 5), detune = clamp((p.detune ?? 12) / 100, 0, 0.5);
  const len = Math.floor(sr * clamp(p.length ?? 3, 0.5, 8));
  const attack = Math.max(0.1, p.attack ?? 0.6) * sr, release = Math.max(0.1, p.release ?? 1.2) * sr;
  const vib = clamp((p.vibrato ?? 15) / 100, 0, 1);
  const phs: number[][][] = chord.map(() => Array.from({ length: voices }, () => Array.from({ length: 3 }, () => Math.random() * 6.28)));
  const oscPhs: number[][] = chord.map(() => Array.from({ length: voices }, () => Math.random() * 6.28));
  const out = new Float32Array(len);
  const bp = chord.map(() => Array.from({ length: 3 }, () => ({ low: 0, band: 0 })));
  for (let i = 0; i < len; i++) {
    const t = i / sr, vmod = 1 + vib * 0.005 * Math.sin(2 * Math.PI * 5 * t);
    let s = 0;
    chord.forEach((semi, ci) => {
      let voiceSig = 0;
      for (let v = 0; v < voices; v++) { const f = noteHz(root + semi) * vmod * Math.pow(2, ((v - (voices - 1) / 2) * detune) / 12); oscPhs[ci][v] += (2 * Math.PI * f) / sr; voiceSig += 2 * ((oscPhs[ci][v] / (2 * Math.PI)) % 1) - 1; }
      voiceSig /= voices;
      let formant = 0;
      for (let k = 0; k < 3; k++) { const fc = F[k], q = 0.06, ff = 2 * Math.sin((Math.PI * Math.min(sr * 0.45, fc)) / sr); const high = voiceSig - bp[ci][k].low - q * bp[ci][k].band; bp[ci][k].band += ff * high; bp[ci][k].low += ff * bp[ci][k].band; formant += bp[ci][k].band * (k === 0 ? 1 : k === 1 ? 0.7 : 0.4); }
      s += formant;
    });
    s /= chord.length;
    let env = 1; if (i < attack) env = i / attack; else if (i > len - release) env = Math.max(0, (len - i) / release);
    out[i] = s * env;
  }
  if (p.chorus !== false) { const cp = out.slice(), maxD = 0.011 * sr; for (let i = 0; i < len; i++) { const d = maxD * (0.5 + 0.5 * Math.sin((2 * Math.PI * 0.18 * i) / sr)); const j = i - Math.floor(d); out[i] = 0.7 * out[i] + 0.5 * (j >= 0 ? cp[j] : 0); } }
  return norm(out);
}
export { CHORDS as CHOIR_CHORDS };
