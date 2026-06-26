// Drum synthesis (pure JS, zero deps). Each generator returns a normalized mono Float32Array.
// kick: pitch-enveloped sine + sub + click + drive. snare: tonal body + band-passed noise.
// clap: multi-burst band-passed noise + tail. hat: high-passed noise + metallic ring.
const TAU = Math.PI * 2;
const rnd = () => Math.random() * 2 - 1;

function norm(x: Float32Array): Float32Array {
  let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; }
  if (m > 0) { const g = 0.92 / m; for (let i = 0; i < x.length; i++) x[i] *= g; }
  return x;
}

function kick(p: any, sr: number): Float32Array {
  const len = Math.floor(sr * (p.length ?? 0.6));
  const f0 = p.tune ?? 150, f1 = (p.tune ?? 150) * 0.33;
  const pd = Math.max(0.005, p.pitchDecay ?? 0.045), ad = Math.max(0.03, p.ampDecay ?? 0.4);
  const drive = p.drive ?? 0.3, sub = p.sub ?? 0.4, click = p.click ?? 0.5;
  const out = new Float32Array(len); let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const f = f1 + (f0 - f1) * Math.exp(-t / pd); ph += (TAU * f) / sr;
    const env = Math.exp(-t / ad);
    let s = Math.sin(ph) * env + Math.sin(ph * 0.5) * env * sub * 0.7;
    if (t < 0.006) s += rnd() * click * (1 - t / 0.006) * 0.8;
    out[i] = Math.tanh(s * (1 + drive * 4)) / (1 + drive * 1.2);
  }
  return norm(out);
}

function snare(p: any, sr: number): Float32Array {
  const len = Math.floor(sr * (p.length ?? 0.4));
  const body = p.tone ?? 180, bd = Math.max(0.02, p.bodyDecay ?? 0.1), nd = Math.max(0.04, p.decay ?? 0.18);
  const noiseAmt = p.noise ?? 0.6, snappy = p.snappy ?? 0.5, drive = p.drive ?? 0.2;
  const out = new Float32Array(len); let ph1 = 0, ph2 = 0, hpPrev = 0, hpY = 0;
  const hpA = Math.exp(-TAU * (1000 + snappy * 4000) / sr);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    ph1 += (TAU * body) / sr; ph2 += (TAU * body * 1.6) / sr;
    const benv = Math.exp(-t / bd);
    const b = (Math.sin(ph1) + 0.6 * Math.sin(ph2)) * benv * (1 - noiseAmt * 0.4);
    const n = rnd(); hpY = hpA * (hpY + n - hpPrev); hpPrev = n;
    out[i] = Math.tanh((b + hpY * Math.exp(-t / nd) * noiseAmt) * (1 + drive * 3));
  }
  return norm(out);
}

function clap(p: any, sr: number): Float32Array {
  const len = Math.floor(sr * (p.length ?? 0.5));
  const bursts = Math.max(1, Math.min(6, Math.round(p.bursts ?? 3)));
  const spacing = Math.max(0.004, (p.spread ?? 10) / 1000);
  const tone = p.tone ?? 1200, bw = p.bandwidth ?? 0.5;
  const out = new Float32Array(len);
  const lpA = 1 - Math.exp(-TAU * (tone * (1 + bw)) / sr); let lpY = 0;
  const hpA = Math.exp(-TAU * (tone * 0.5) / sr); let hpPrev = 0, hpY = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const n = rnd(); hpY = hpA * (hpY + n - hpPrev); hpPrev = n; lpY += lpA * (hpY - lpY);
    let env = 0;
    for (let k = 0; k < bursts; k++) { const dt = t - k * spacing; if (dt >= 0) env += Math.exp(-dt / 0.008); }
    const td = t - (bursts - 1) * spacing; if (td >= 0) env += Math.exp(-td / 0.12) * 0.7;
    out[i] = lpY * Math.min(1.6, env);
  }
  return norm(out);
}

function hat(p: any, sr: number): Float32Array {
  const open = !!p.open, dec = Math.max(0.02, p.decay ?? (open ? 0.3 : 0.06));
  const len = Math.floor(sr * (dec * 1.5 + 0.02));
  const cut = p.tone ?? 7000, metalAmt = p.metallic ?? 0.4;
  const out = new Float32Array(len);
  const hpA = Math.exp(-TAU * cut / sr); let hpPrev = 0, hpY = 0;
  const parts = [2, 3, 4.16, 5.43, 6.79, 8.21], phs = parts.map(() => 0);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let metal = 0; for (let k = 0; k < parts.length; k++) { phs[k] += (TAU * 800 * parts[k]) / sr; metal += Math.sign(Math.sin(phs[k])); }
    metal /= parts.length;
    const n = rnd() * (1 - metalAmt) + metal * metalAmt;
    hpY = hpA * (hpY + n - hpPrev); hpPrev = n;
    out[i] = hpY * Math.exp(-t / dec);
  }
  return norm(out);
}

export function synthDrum(type: string, p: any = {}, sr = 44100): Float32Array {
  if (type === "snare") return snare(p, sr);
  if (type === "clap") return clap(p, sr);
  if (type === "hat") return hat(p, sr);
  return kick(p, sr);
}
