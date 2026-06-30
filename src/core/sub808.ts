// 808 synthesis (pure JS). A tuned sine with a fast downward pitch glide, a long amplitude
// decay (the boom/sustain) and tanh saturation for the classic 808 harmonics, plus a click.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

export function synth808(p: any = {}, sr = 44100): Float32Array {
  const note = p.note ?? 24;                       // fundamental MIDI note (default C1)
  const glide = p.glide ?? 12;                      // initial pitch lift in semitones
  const glideTime = Math.max(0.004, p.glideTime ?? 0.04);
  const decay = Math.max(0.1, p.decay ?? 0.8);      // amplitude decay — long for an 808
  const drive = Math.max(0, Math.min(1, p.drive ?? 0.4));
  const click = Math.max(0, Math.min(1, p.click ?? 0.3));
  const f0 = noteHz(note), fStart = f0 * Math.pow(2, glide / 12);
  const len = Math.floor(sr * (p.length ?? decay * 1.6 + 0.05));
  const out = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const f = f0 + (fStart - f0) * Math.exp(-t / glideTime);
    ph += (2 * Math.PI * f) / sr;
    const env = Math.exp(-t / decay);
    let s = Math.sin(ph) * env;
    if (t < 0.005) s += (Math.random() * 2 - 1) * click * (1 - t / 0.005) * 0.6;
    s = Math.tanh(s * (1 + drive * 5)) / (1 + drive * 0.8);
    out[i] = s;
  }
  return norm(out);
}
