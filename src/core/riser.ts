// Riser / sweep synthesis (pure JS). Noise and/or oscillator source with a pitch sweep, a
// moving SVF filter, volume fade, movement modulation, drive and an optional modulated-delay FX.
const noteHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function norm(x: Float32Array): Float32Array { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } if (m > 0) { const g = 0.95 / m; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; }

function filterSweep(x: Float32Array, sr: number, mode: string, dir: string): void {
  let low = 0, band = 0; const q = 0.55;
  for (let i = 0; i < x.length; i++) {
    const t = i / x.length;
    const fc = dir === "down" ? lerp(8000, 200, t) : lerp(200, 8000, t);
    const f = 2 * Math.sin((Math.PI * Math.min(sr * 0.45, fc)) / sr);
    const high = x[i] - low - q * band; band += f * high; low += f * band;
    x[i] = mode === "hp" ? high : mode === "bp" ? band : low;
  }
}

export function synthRiser(p: any = {}, sr = 44100): Float32Array {
  const dur = Math.max(0.2, Math.min(20, p.length ?? 3));
  const n = Math.floor(sr * dur);
  const out = new Float32Array(n);
  const src = p.source || "mix", wave = p.wave || "saw", noiseType = p.noise || "white";
  const f0 = noteHz(p.startNote ?? 45), f1 = noteHz(p.endNote ?? 69);
  const pink = [0, 0, 0, 0, 0, 0, 0]; let brown = 0, ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const white = Math.random() * 2 - 1;
    let noise = white;
    if (noiseType === "pink") { pink[0] = 0.99886 * pink[0] + white * 0.0555179; pink[1] = 0.99332 * pink[1] + white * 0.0750759; pink[2] = 0.96900 * pink[2] + white * 0.1538520; pink[3] = 0.86650 * pink[3] + white * 0.3104856; pink[4] = 0.55000 * pink[4] + white * 0.5329522; pink[5] = -0.7616 * pink[5] - white * 0.0168980; noise = (pink[0] + pink[1] + pink[2] + pink[3] + pink[4] + pink[5] + pink[6] + white * 0.5362) * 0.11; pink[6] = white * 0.115926; }
    else if (noiseType === "brown") { brown = (brown + 0.02 * white) / 1.02; noise = brown * 3.5; }
    const f = f0 * Math.pow(f1 / f0, t); ph += (2 * Math.PI * f) / sr;
    const osc = wave === "sine" ? Math.sin(ph) : wave === "square" ? Math.sign(Math.sin(ph)) : 2 * ((ph / (2 * Math.PI)) % 1) - 1;
    out[i] = src === "noise" ? noise : src === "osc" ? osc : noise * 0.55 + osc * 0.5;
  }
  if ((p.filter || "lp") !== "none") filterSweep(out, sr, p.filter || "lp", p.filterDir || "up");
  const vol = p.volume || "up";
  const mv = ({ off: 0, gentle: 0.15, medium: 0.35, extreme: 0.6 } as any)[p.movement || "gentle"] || 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    let env = vol === "down" ? 1 - t : vol === "const" ? 1 : t;
    if (mv) env *= (1 - mv * 0.5) + mv * 0.5 * Math.sin(2 * Math.PI * (2 + 8 * t) * t);
    out[i] *= env;
  }
  if (p.drive) for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * (1 + p.drive * 4));
  if (p.fx && p.fx !== "none") { const maxD = (p.fx === "chorus" ? 0.012 : 0.004) * sr, rate = p.fx === "phaser" ? 0.5 : 0.25; const cp = out.slice(); for (let i = 0; i < n; i++) { const d = maxD * (0.5 + 0.5 * Math.sin((2 * Math.PI * rate * i) / sr)); const j = i - Math.floor(d); out[i] = 0.7 * out[i] + 0.6 * (j >= 0 ? cp[j] : 0); } }
  return norm(out);
}
