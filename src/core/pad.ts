// Pad / drone synthesis (pure JS). A detuned-saw oscillator bank (optionally a chord) through a
// slow-moving low-pass filter, a long attack/release envelope and a chorus — evolving textures.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.93 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }
const CHORDS: Record<string, number[]> = { single:[0], maj:[0,4,7], min:[0,3,7], maj7:[0,4,7,11], min7:[0,3,7,10], sus2:[0,2,7], sus4:[0,5,7], min9:[0,3,7,10,14] };

export function synthPad(p: any = {}, sr = 44100): Float32Array {
  const root = p.note ?? 48;
  const chord = CHORDS[p.chord] || CHORDS.min7;
  const voices = Math.round(clamp(p.voices ?? 3, 1, 7));
  const detune = (p.detune ?? 15) / 100;
  const len = Math.floor(sr * clamp(p.length ?? 4, 0.5, 12));
  const out = new Float32Array(len);
  const oscs: { f: number; ph: number }[] = [];
  for (const semi of chord) { const f = noteHz(root + semi); for (let v = 0; v < voices; v++) { const d = (v - (voices - 1) / 2) * detune; oscs.push({ f: f * Math.pow(2, d / 12), ph: Math.random() * 2 * Math.PI }); } }
  const attack = clamp(p.attack ?? 0.8, 0.01, 5) * sr, release = clamp(p.release ?? 1.5, 0.05, 8) * sr;
  const cutoffBase = p.cutoff ?? 1200, lfoRate = p.lfoRate ?? 0.2, lfoDepth = (p.lfoDepth ?? 40) / 100;
  let low = 0, band = 0; const q = 0.7;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let s = 0; for (const o of oscs) { o.ph += (2 * Math.PI * o.f) / sr; s += 2 * ((o.ph / (2 * Math.PI)) % 1) - 1; }
    s /= oscs.length;
    const fc = clamp(cutoffBase * (1 + lfoDepth * Math.sin(2 * Math.PI * lfoRate * t)), 60, sr * 0.45);
    const f = 2 * Math.sin((Math.PI * fc) / sr);
    const high = s - low - q * band; band += f * high; low += f * band;
    let env = 1; if (i < attack) env = i / attack; else if (i > len - release) env = Math.max(0, (len - i) / release);
    out[i] = low * env;
  }
  if (p.chorus !== false) { const cp = out.slice(); const maxD = 0.012 * sr; for (let i = 0; i < len; i++) { const d = maxD * (0.5 + 0.5 * Math.sin((2 * Math.PI * 0.15 * i) / sr)); const j = i - Math.floor(d); out[i] = 0.7 * out[i] + 0.5 * (j >= 0 ? cp[j] : 0); } }
  return norm(out);
}
export { CHORDS };
