// Audio slice + per-slice FX engine (pure JS). Slice a buffer, process each slice with a chain
// of effects (reverse, stutter, pitch, tape-stop, SVF filter, bitcrush, flanger, gated reverb),
// then reassemble with optional crossfades. Shared by Slice Lab (pattern) and Mosaic (generative).

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function sliceBuffer(x: Float32Array, n: number): Float32Array[] {
  n = Math.max(1, Math.min(64, n));
  const len = Math.floor(x.length / n);
  const out: Float32Array[] = [];
  for (let i = 0; i < n; i++) out.push(x.subarray(i * len, i * len + len));
  return out;
}

function resampleTo(x: Float32Array, outLen: number): Float32Array {
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) { const t = (i * (x.length - 1)) / Math.max(1, outLen - 1), i0 = Math.floor(t), f = t - i0; out[i] = (x[i0] || 0) * (1 - f) + (x[i0 + 1] || 0) * f; }
  return out;
}
function pitchKeepLen(x: Float32Array, semis: number): Float32Array {
  if (!semis) return x;
  const ratio = Math.pow(2, semis / 12);
  const rs = resampleTo(x, Math.max(1, Math.round(x.length / ratio)));
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = rs[i] || 0;
  return out;
}
function reverse(x: Float32Array): Float32Array { const out = new Float32Array(x.length); for (let i = 0; i < x.length; i++) out[i] = x[x.length - 1 - i]; return out; }
function stutter(x: Float32Array, count: number): Float32Array { count = Math.max(1, Math.min(16, Math.round(count))); if (count <= 1) return x; const seg = Math.max(1, Math.floor(x.length / count)); const out = new Float32Array(x.length); for (let i = 0; i < x.length; i++) out[i] = x[i % seg] || 0; return out; }
function tapeStop(x: Float32Array): Float32Array { const out = new Float32Array(x.length); let pos = 0; for (let i = 0; i < x.length; i++) { pos += 1 - i / x.length; out[i] = x[Math.min(x.length - 1, Math.floor(pos))] || 0; } return out; }
function bitcrush(x: Float32Array, bits: number): Float32Array { bits = Math.max(1, Math.min(16, Math.round(bits))); const levels = Math.pow(2, bits); const hold = Math.max(1, Math.round(17 - bits)); const out = new Float32Array(x.length); let last = 0; for (let i = 0; i < x.length; i++) { if (i % hold === 0) last = Math.round(x[i] * levels) / levels; out[i] = last; } return out; }
function svf(x: Float32Array, sr: number, mode: string, cutoffHz: number, res: number, sweep: number): Float32Array {
  const out = new Float32Array(x.length); let low = 0, band = 0;
  const q = Math.max(0.05, 1 - Math.min(0.95, res || 0));
  for (let i = 0; i < x.length; i++) {
    const t = i / Math.max(1, x.length - 1);
    const fc = Math.max(40, Math.min(sr * 0.45, cutoffHz * (1 + (sweep || 0) * t)));
    const f = 2 * Math.sin((Math.PI * fc) / sr);
    const high = x[i] - low - q * band; band += f * high; low += f * band;
    out[i] = mode === "hp" ? high : mode === "bp" ? band : mode === "notch" ? high + low : low;
  }
  return out;
}
function flanger(x: Float32Array, sr: number): Float32Array { const out = new Float32Array(x.length); const maxD = 0.003 * sr; for (let i = 0; i < x.length; i++) { const d = maxD * (0.5 + 0.5 * Math.sin((2 * Math.PI * 0.3 * i) / sr)); const j = i - Math.floor(d); out[i] = 0.7 * x[i] + 0.7 * (j >= 0 ? x[j] : 0); } return out; }
function gatedReverb(x: Float32Array, sr: number): Float32Array { const out = new Float32Array(x.length); const dl = Math.max(1, Math.floor(0.025 * sr)); for (let i = 0; i < x.length; i++) out[i] = x[i] + (i >= dl ? out[i - dl] * 0.5 : 0); const gate = Math.floor(x.length * 0.6); for (let i = gate; i < x.length; i++) out[i] *= Math.max(0, 1 - (i - gate) / (x.length - gate)); return out; }

export type SliceFx = { reverse?: boolean; stutter?: number; pitch?: number; tapestop?: boolean; bitcrush?: number; filter?: boolean; filterMode?: string; cutoff?: number; res?: number; sweep?: number; flanger?: boolean; gatereverb?: boolean };

export function applyFx(x: Float32Array, fx: SliceFx, sr: number): Float32Array {
  let s = x;
  if (fx.pitch) s = pitchKeepLen(s, fx.pitch);
  if (fx.reverse) s = reverse(s);
  if (fx.stutter && fx.stutter > 1) s = stutter(s, fx.stutter);
  if (fx.tapestop) s = tapeStop(s);
  if (fx.filter) s = svf(s, sr, fx.filterMode || "lp", fx.cutoff ?? 1200, fx.res ?? 0.3, fx.sweep ?? 0);
  if (fx.bitcrush && fx.bitcrush < 16) s = bitcrush(s, fx.bitcrush);
  if (fx.flanger) s = flanger(s, sr);
  if (fx.gatereverb) s = gatedReverb(s, sr);
  return s;
}

export function assemble(slices: Float32Array[], crossfade: number): Float32Array {
  if (!slices.length) return new Float32Array(0);
  const sl = slices[0].length, cf = Math.max(0, Math.min(Math.floor(sl / 2), crossfade || 0));
  const step = sl - cf, outLen = step * (slices.length - 1) + sl;
  const out = new Float32Array(outLen);
  for (let s = 0; s < slices.length; s++) {
    const sli = slices[s], base = s * step;
    for (let i = 0; i < sl; i++) {
      let g = 1;
      if (cf > 0) { if (s > 0 && i < cf) g = i / cf; else if (s < slices.length - 1 && i >= sl - cf) g = (sl - 1 - i) / cf; }
      out[base + i] += (sli[i] || 0) * g;
    }
  }
  let m = 0; for (let i = 0; i < out.length; i++) { const a = Math.abs(out[i]); if (a > m) m = a; }
  if (m > 1) { const gain = 0.97 / m; for (let i = 0; i < out.length; i++) out[i] *= gain; }
  return out;
}
