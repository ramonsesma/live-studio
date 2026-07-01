// Trumpet / solo brass (pure JS). A single saw through a band-pass formant + slow attack
// envelope + vibrato — a single-voice brass solo line, brighter than the Brass section.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthTrumpet(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 65, len = Math.floor(sr * clamp(p.length ?? 1, 0.15, 5));
  const attack = Math.max(0.005, p.attack ?? 0.05) * sr, release = Math.max(0.03, p.release ?? 0.12) * sr;
  const vib = clamp((p.vibrato ?? 30) / 100, 0, 1), drive = clamp(p.drive ?? 0.4, 0, 1);
  const bright = clamp(p.brightness ?? 0.5, 0, 1);
  const f0 = noteHz(note), out = new Float32Array(len); let ph = 0;
  let low = 0, band = 0, low2 = 0, band2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr, vmod = 1 + vib * 0.01 * Math.sin(2 * Math.PI * 5.5 * t);
    ph += (2 * Math.PI * f0 * vmod) / sr;
    const saw = 2 * ((ph / (2 * Math.PI)) % 1) - 1;
    // formant-ish dual band-pass around 1.5k and 3k for brassy edge
    const fc1 = 1200 + bright * 1200, fc2 = 2800 + bright * 1500;
    const q = 0.12, f = 2 * Math.sin((Math.PI * fc1) / sr), f2b = 2 * Math.sin((Math.PI * fc2) / sr);
    const high = saw - low - q * band; band += f * high; low += f * band;
    const high2 = saw - low2 - q * band2; band2 += f2b * high2; low2 += f2b * band2;
    let env = 1; if (i < attack) env = i / attack; else if (i > len - release) env = Math.max(0, (len - i) / release);
    out[i] = Math.tanh((band * 1.2 + band2 * 0.7 + saw * 0.15) * env * (1 + drive * 2.5));
  }
  return norm(out);
}
