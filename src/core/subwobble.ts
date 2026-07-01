// Sub Wobble (pure JS). A sine sub-bass with the wobble's LFO on amplitude (tremolo) and a
// gentle sine-wave pitch modulation — like a sub-only wobble that fits under a Reese.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synthSubWobble(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 28, bpm = clamp(p.bpm ?? 140, 60, 200), bars = Math.round(clamp(p.bars ?? 1, 1, 4));
  const len = Math.floor((60 / bpm) * 4 * bars * sr);
  const rate = clamp(p.rate ?? 0.5, 0.125, 4), wobbleHz = bpm / 60 / rate;
  const depth = clamp((p.depth ?? 70) / 100, 0, 1), drive = clamp(p.drive ?? 0.3, 0, 1);
  const f = noteHz(note), out = new Float32Array(len); let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * wobbleHz * t);
    const pitchMod = 1 + depth * 0.04 * Math.sin(2 * Math.PI * wobbleHz * t * 0.5);
    ph += (2 * Math.PI * f * pitchMod) / sr;
    const s = Math.sin(ph);
    const amp = (1 - depth) + depth * lfo;
    out[i] = Math.tanh(s * amp * (1 + drive * 3));
  }
  return norm(out);
}
