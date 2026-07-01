// Accordion (pure JS). Two reed oscillators per note, slightly detuned (musette), square-ish
// reed timbre via clipped sine, slow attack/release bellows envelope.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }
const CHORDS: Record<string, number[]> = { single:[0], maj:[0,4,7], min:[0,3,7], maj7:[0,4,7,11] };

export function synthAccordion(p: any = {}, sr = 44100): Float32Array {
  const root = p.note ?? 60, chord = CHORDS[p.chord] || CHORDS.single;
  const musette = clamp((p.musette ?? 12) / 100, 0, 0.4), reediness = clamp(p.reediness ?? 0.4, 0, 1);
  const len = Math.floor(sr * clamp(p.length ?? 2, 0.3, 8));
  const attack = Math.max(0.02, p.attack ?? 0.15) * sr, release = Math.max(0.05, p.release ?? 0.3) * sr;
  const out = new Float32Array(len);
  const phs = chord.map(() => [0, 0]);
  for (let i = 0; i < len; i++) {
    let s = 0;
    chord.forEach((semi: number, ci: number) => {
      const f = noteHz(root + semi);
      phs[ci][0] += (2 * Math.PI * f) / sr; phs[ci][1] += (2 * Math.PI * f * (1 + musette / 12)) / sr;
      const w1 = Math.sin(phs[ci][0]) + reediness * 0.3 * Math.sign(Math.sin(phs[ci][0]));
      const w2 = Math.sin(phs[ci][1]) + reediness * 0.3 * Math.sign(Math.sin(phs[ci][1]));
      s += (w1 + w2) * 0.5;
    });
    s /= chord.length;
    let env = 1; if (i < attack) env = i / attack; else if (i > len - release) env = Math.max(0, (len - i) / release);
    out[i] = s * env;
  }
  return norm(out);
}
