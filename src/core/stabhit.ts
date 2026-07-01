// Stab Brass Hit (pure JS). A very short, hard-hitting brass/orchestra stab — saw stack with a
// fast filter-envelope snap and a noise transient, decaying quickly (opposite of Brass/Trumpet).
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }
const CHORDS: Record<string, number[]> = { single:[0], maj:[0,4,7], min:[0,3,7], dom7:[0,4,7,10] };

export function synthStabHit(p: any = {}, sr = 44100): Float32Array {
  const root = p.note ?? 60, chord = CHORDS[p.chord] || CHORDS.maj;
  const decay = Math.max(0.05, p.decay ?? 0.22), punch = clamp((p.punch ?? 60) / 100, 0, 1), drive = clamp(p.drive ?? 0.5, 0, 1);
  const len = Math.floor(sr * clamp(p.length ?? 0.4, 0.1, 1.5));
  const oscs: { f: number; ph: number }[] = [];
  chord.forEach((semi: number) => { const f = noteHz(root + semi); oscs.push({ f, ph: 0 }, { f: f * 1.003, ph: Math.random() * 6.28 }); });
  const out = new Float32Array(len); let low = 0, band = 0;
  const atk = Math.floor(sr * 0.002);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let s = 0; for (const o of oscs) { o.ph += (2 * Math.PI * o.f) / sr; s += 2 * ((o.ph / (2 * Math.PI)) % 1) - 1; }
    s /= oscs.length;
    if (t < 0.003) s += (Math.random() * 2 - 1) * punch * (1 - t / 0.003);
    const env = Math.exp(-t / decay);
    const fc = clamp(3000 * (1 + env * 2), 200, sr * 0.45), q = 0.3, f = 2 * Math.sin((Math.PI * fc) / sr);
    const high = s - low - q * band; band += f * high; low += f * band;
    const amp = (i < atk ? i / atk : 1) * env;
    out[i] = Math.tanh(low * amp * (1 + drive * 3));
  }
  return norm(out);
}
