// Saw Lead (pure JS). Detuned saw stack through a resonant low-pass with envelope, glide and a
// vibrato — the classic supersaw / trance lead. Optional unison voices for thickness.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.94 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthSawLead(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 60, voices = Math.round(clamp(p.voices ?? 5, 1, 9)), detune = clamp((p.detune ?? 20) / 100, 0, 0.6);
  const len = Math.floor(sr * clamp(p.length ?? 1.2, 0.1, 6));
  const attack = Math.max(0.001, p.attack ?? 0.01) * sr, release = Math.max(0.02, p.release ?? 0.2) * sr;
  const cutoff = p.cutoff ?? 3500, reso = clamp(p.reso ?? 0.4, 0, 0.9), envMod = clamp((p.envMod ?? 50) / 100, 0, 1);
  const vib = clamp((p.vibrato ?? 15) / 100, 0, 1), drive = clamp(p.drive ?? 0.3, 0, 1);
  const f0 = noteHz(note);
  const phs = Array.from({ length: voices }, () => Math.random() * 6.28);
  const out = new Float32Array(len); let low = 0, band = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr, vmod = 1 + vib * 0.006 * Math.sin(2 * Math.PI * 5 * t);
    let s = 0;
    for (let v = 0; v < voices; v++) { const f = f0 * vmod * Math.pow(2, ((v - (voices - 1) / 2) * detune) / 12); phs[v] += (2 * Math.PI * f) / sr; s += 2 * ((phs[v] / (2 * Math.PI)) % 1) - 1; }
    s /= voices;
    const fenv = i < sr * 0.2 ? i / (sr * 0.2) : 1;
    const fc = clamp(cutoff * (1 + envMod * fenv * 0.7), 200, sr * 0.45), q = 1 - reso, ff = 2 * Math.sin((Math.PI * fc) / sr);
    const high = s - low - q * band; band += ff * high; low += ff * band;
    let env = 1; if (i < attack) env = i / attack; else if (i > len - release) env = Math.max(0, (len - i) / release);
    out[i] = Math.tanh(low * env * (1 + drive * 2.5));
  }
  return norm(out);
}
