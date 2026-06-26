// Time-stretch DSP (pure JS, zero deps). Two modes:
//  - olaStretch: WSOLA-style overlap-add — changes length, PRESERVES pitch.
//  - varispeed: linear resample — changes length AND pitch together (tape-style).
// ratio = output length / input length (ratio > 1 → longer / slower).

function hann(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

export function olaStretch(x: Float32Array, ratio: number, grain: number): Float32Array {
  grain = Math.max(64, Math.min(4096, Math.round(grain)));
  if (x.length < grain * 2) return x.slice();
  const Hs = Math.floor(grain / 2);                 // synthesis hop (50% overlap)
  const Ha = Math.max(1, Math.round(Hs / ratio));   // analysis hop
  const overlap = grain - Hs;
  const win = hann(grain);
  const outLen = Math.ceil(x.length * ratio) + grain;
  const out = new Float32Array(outLen);
  const norm = new Float32Array(outLen);
  const search = Math.min(Hs, 256);                 // WSOLA search radius
  let ana = 0, outPos = 0;
  let prevTail: Float32Array | null = null;
  while (outPos + grain <= outLen && Math.floor(ana) + grain <= x.length) {
    let a = Math.floor(ana);
    if (prevTail) {                                 // WSOLA: align grain start to the previous grain's natural successor
      let best = -Infinity, bestD = 0;
      for (let d = -search; d <= search; d++) {
        const aa = a + d;
        if (aa < 0 || aa + overlap >= x.length) continue;
        let s = 0; for (let i = 0; i < overlap; i++) s += x[aa + i] * prevTail[i];
        if (s > best) { best = s; bestD = d; }
      }
      a = Math.max(0, Math.min(x.length - grain, a + bestD));
    }
    for (let i = 0; i < grain; i++) { out[outPos + i] += x[a + i] * win[i]; norm[outPos + i] += win[i]; }
    prevTail = new Float32Array(overlap);
    for (let i = 0; i < overlap; i++) prevTail[i] = x[a + Hs + i] || 0;
    outPos += Hs;
    ana += Ha;
  }
  for (let i = 0; i < outLen; i++) if (norm[i] > 1e-6) out[i] /= norm[i];
  return out.subarray(0, Math.max(1, Math.round(x.length * ratio)));
}

export function varispeed(x: Float32Array, ratio: number): Float32Array {
  const outLen = Math.max(1, Math.round(x.length * ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) { const t = i / ratio, i0 = Math.floor(t), f = t - i0; out[i] = (x[i0] || 0) * (1 - f) + (x[i0 + 1] || 0) * f; }
  return out;
}

// Downsampled peak envelope for a waveform preview (n columns of max-abs).
export function wavePeaks(x: Float32Array, n = 200): number[] {
  const peaks: number[] = [];
  const step = Math.max(1, Math.floor(x.length / n));
  for (let i = 0; i < x.length; i += step) { let m = 0; for (let j = 0; j < step && i + j < x.length; j++) { const v = Math.abs(x[i + j]); if (v > m) m = v; } peaks.push(Number(m.toFixed(3))); }
  return peaks;
}
