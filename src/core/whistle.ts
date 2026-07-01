// Whistle (pure JS). A near-pure sine with light vibrato, breath noise crossfaded at the
// attack and a soft attack envelope — single-voice human/synth whistle.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthWhistle(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 72, len = Math.floor(sr * clamp(p.length ?? 1.5, 0.2, 6));
  const attack = Math.max(0.02, p.attack ?? 0.08) * sr, release = Math.max(0.05, p.release ?? 0.15) * sr;
  const vib = clamp((p.vibrato ?? 35) / 100, 0, 1), breath = clamp((p.breath ?? 20) / 100, 0, 1);
  const bend = clamp(p.bend ?? 0, -12, 12);
  const f0 = noteHz(note), fStart = f0 * Math.pow(2, bend / 12);
  const out = new Float32Array(len); let ph = 0, lpN = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const f = f0 + (fStart - f0) * Math.exp(-t / 0.08);
    const vmod = 1 + vib * 0.012 * Math.sin(2 * Math.PI * 5.5 * t);
    ph += (2 * Math.PI * f * vmod) / sr;
    let s = Math.sin(ph) + 0.05 * Math.sin(2 * ph);
    const n = Math.random() * 2 - 1; lpN += 0.05 * (n - lpN);
    const breathLevel = breath * Math.exp(-t / 0.15);
    s += lpN * breathLevel;
    let env = 1; if (i < attack) env = i / attack; else if (i > len - release) env = Math.max(0, (len - i) / release);
    out[i] = s * env;
  }
  return norm(out);
}
