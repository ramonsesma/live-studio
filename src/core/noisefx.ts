// Noise FX (pure JS). 4 types: sweep_up / sweep_down / risetail / whoosh — short pure-noise
// transitions tinier than the Riser but heavier on noise color.
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

function pinkSample(state: number[]): number {
  const w = Math.random() * 2 - 1;
  state[0] = 0.99886 * state[0] + w * 0.0555179; state[1] = 0.99332 * state[1] + w * 0.0750759; state[2] = 0.96900 * state[2] + w * 0.1538520; state[3] = 0.86650 * state[3] + w * 0.3104856; state[4] = 0.55000 * state[4] + w * 0.5329522; state[5] = -0.7616 * state[5] - w * 0.0168980;
  const v = (state[0] + state[1] + state[2] + state[3] + state[4] + state[5] + state[6] + w * 0.5362) * 0.11;
  state[6] = w * 0.115926;
  return v;
}

export function synthNoiseFX(p: any = {}, sr = 44100): Float32Array {
  const type = ["sweep_up", "sweep_down", "risetail", "whoosh"].includes(p.type) ? p.type : "sweep_up";
  const len = Math.floor(sr * clamp(p.length ?? 1.5, 0.2, 6));
  const drive = clamp(p.drive ?? 0.4, 0, 1), color = clamp(p.color ?? 0.5, 0, 1);
  const out = new Float32Array(len); const pink: number[] = [0,0,0,0,0,0,0];
  let low = 0, band = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const w = Math.random() * 2 - 1, pn = pinkSample(pink);
    const src = w * (1 - color) + pn * color;
    let fc = 1000;
    if (type === "sweep_up") fc = 200 + t * 7000;
    else if (type === "sweep_down") fc = 7000 - t * 6800;
    else if (type === "risetail") fc = 400 + Math.pow(t, 3) * 8000;
    else if (type === "whoosh") fc = 200 + Math.sin(Math.PI * t) * 5500;
    fc = Math.min(sr * 0.45, Math.max(60, fc));
    const f = 2 * Math.sin((Math.PI * fc) / sr), q = 0.6;
    const high = src - low - q * band; band += f * high; low += f * band;
    let env = 1;
    if (type === "sweep_up" || type === "risetail") env = t;
    else if (type === "sweep_down") env = 1 - t;
    else env = Math.sin(Math.PI * t);
    out[i] = Math.tanh(band * env * (1 + drive * 3));
  }
  return norm(out);
}
