// Audio utility DSP shared by the strip-silence / transient / clip-editor / convert /
// extreme-stretch / reverse-verb / iterate pipeline tools. Pure JS, mono Float32Array in/out.
import { encodeWav16 } from "./dsp.js";
import { mulberry32 } from "./slicefx.js";
import { writeFileSync } from "node:fs";

const TAU = Math.PI * 2;

export function rmsDb(x: Float32Array, from = 0, to = x.length): number {
  let s = 0, n = 0;
  for (let i = from; i < Math.min(to, x.length); i++) { s += x[i] * x[i]; n++; }
  if (!n) return -Infinity;
  const r = Math.sqrt(s / n);
  return r > 0 ? 20 * Math.log10(r) : -Infinity;
}

export function applyGainDb(x: Float32Array, db: number): Float32Array {
  const g = Math.pow(10, db / 20);
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = Math.max(-1, Math.min(1, x[i] * g));
  return out;
}

// Peak-safe RMS normalize: gain toward targetDb, then clamp so the peak stays under ceilingDb.
export function normalizeRms(x: Float32Array, targetDb: number, ceilingDb = -0.3): { out: Float32Array; gainDb: number } {
  const cur = rmsDb(x);
  if (!isFinite(cur)) return { out: x.slice(), gainDb: 0 };
  let gain = targetDb - cur;
  let peak = 0; for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
  if (isFinite(peakDb) && peakDb + gain > ceilingDb) gain = ceilingDb - peakDb;
  return { out: applyGainDb(x, gain), gainDb: Number(gain.toFixed(2)) };
}

// Silence map over a short-window RMS envelope. Returns contiguous regions labeled
// sound/silence, plus the lead/tail silence durations — the strip-silence workhorse.
export function silenceRegions(x: Float32Array, sr: number, thresholdDb = -48, minSilenceMs = 120): { regions: { startSec: number; endSec: number; type: "sound" | "silence" }[]; leadSec: number; tailSec: number } {
  const win = Math.max(32, Math.floor(sr * 0.01)); // 10 ms windows
  const nWin = Math.max(1, Math.floor(x.length / win));
  const loud: boolean[] = new Array(nWin);
  for (let w = 0; w < nWin; w++) loud[w] = rmsDb(x, w * win, (w + 1) * win) > thresholdDb;
  const minWins = Math.max(1, Math.round((minSilenceMs / 1000) * sr / win));
  // Merge short silence gaps into the surrounding sound so tiny inter-note dips don't split regions.
  let i = 0;
  while (i < nWin) {
    if (!loud[i]) {
      let j = i; while (j < nWin && !loud[j]) j++;
      if (j - i < minWins && i > 0 && j < nWin) for (let k = i; k < j; k++) loud[k] = true;
      i = j;
    } else i++;
  }
  const regions: { startSec: number; endSec: number; type: "sound" | "silence" }[] = [];
  i = 0;
  while (i < nWin) {
    const t = loud[i];
    let j = i; while (j < nWin && loud[j] === t) j++;
    regions.push({ startSec: (i * win) / sr, endSec: Math.min(x.length, j * win) / sr, type: t ? "sound" : "silence" });
    i = j;
  }
  const leadSec = regions.length && regions[0].type === "silence" ? regions[0].endSec - regions[0].startSec : 0;
  const tailSec = regions.length && regions[regions.length - 1].type === "silence" ? regions[regions.length - 1].endSec - regions[regions.length - 1].startSec : 0;
  return { regions, leadSec, tailSec };
}

export function sliceSeconds(x: Float32Array, sr: number, startSec: number, endSec: number): Float32Array {
  const a = Math.max(0, Math.floor(startSec * sr)), b = Math.min(x.length, Math.floor(endSec * sr));
  return x.slice(a, Math.max(a, b));
}

export function fadeEdges(x: Float32Array, sr: number, inMs = 5, outMs = 5): Float32Array {
  const out = x.slice();
  const fi = Math.min(out.length, Math.floor((inMs / 1000) * sr));
  const fo = Math.min(out.length, Math.floor((outMs / 1000) * sr));
  for (let i = 0; i < fi; i++) out[i] *= i / fi;
  for (let i = 0; i < fo; i++) out[out.length - 1 - i] *= i / fo;
  return out;
}

// Linear-interpolation resampler — real conversion, adequate quality for utility work.
export function resampleLinear(x: Float32Array, fromSr: number, toSr: number): Float32Array {
  if (fromSr === toSr) return x.slice();
  const outLen = Math.max(1, Math.round(x.length * (toSr / fromSr)));
  const out = new Float32Array(outLen);
  const step = fromSr / toSr;
  for (let i = 0; i < outLen; i++) {
    const pos = i * step, i0 = Math.floor(pos), frac = pos - i0;
    out[i] = (x[i0] ?? 0) * (1 - frac) + (x[i0 + 1] ?? 0) * frac;
  }
  return out;
}

// Simple Schroeder reverb (4 combs + 2 allpass) — used by the reverse-verb swell.
export function schroederReverb(x: Float32Array, sr: number, decaySec = 2.2, wet = 1.0): Float32Array {
  const combDelays = [0.0297, 0.0371, 0.0411, 0.0437].map((s) => Math.floor(s * sr));
  const apDelays = [0.005, 0.0017].map((s) => Math.floor(s * sr));
  const tailLen = Math.floor(decaySec * sr);
  const out = new Float32Array(x.length + tailLen);
  for (const d of combDelays) {
    const g = Math.pow(10, (-3 * d) / (decaySec * sr)); // -60 dB over decaySec
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < out.length; i++) {
      const inp = i < x.length ? x[i] : 0;
      const y = buf[idx];
      buf[idx] = inp + y * g;
      out[i] += y / combDelays.length;
      idx = (idx + 1) % d;
    }
  }
  for (const d of apDelays) {
    const g = 0.7;
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < out.length; i++) {
      const inp = out[i];
      const y = buf[idx];
      buf[idx] = inp + y * g;
      out[i] = y - g * buf[idx];
      idx = (idx + 1) % d;
    }
  }
  if (wet < 1) for (let i = 0; i < out.length; i++) out[i] = out[i] * wet + (i < x.length ? x[i] : 0) * (1 - wet);
  let m = 0; for (let i = 0; i < out.length; i++) m = Math.max(m, Math.abs(out[i]));
  if (m > 0.95) { const g = 0.95 / m; for (let i = 0; i < out.length; i++) out[i] *= g; }
  return out;
}

// Extreme "freeze" stretch — our own granular take on the Paulstretch CONCEPT (not its code):
// long Hann-windowed grains sourced with seeded jitter, overlap-added at a slowed output hop.
// The jitter decorrelates repeats so 10-100x factors smear into a pad instead of stuttering.
export function granularExtreme(x: Float32Array, sr: number, factor: number, grainMs = 220, seed = 7): Float32Array {
  const f = Math.max(2, Math.min(200, factor));
  const grain = Math.max(256, Math.floor((grainMs / 1000) * sr));
  const inHop = Math.max(1, Math.floor(grain / (2 * f)));
  const outHop = Math.floor(grain / 2);
  const nGrains = Math.max(1, Math.floor((x.length - grain) / inHop));
  const out = new Float32Array(nGrains * outHop + grain);
  const win = new Float32Array(grain);
  for (let i = 0; i < grain; i++) win[i] = 0.5 - 0.5 * Math.cos((TAU * i) / grain);
  const rand = mulberry32(seed);
  for (let g = 0; g < nGrains; g++) {
    const jitter = Math.floor((rand() - 0.5) * grain * 0.5);
    const src = Math.max(0, Math.min(x.length - grain, g * inHop + jitter));
    const dst = g * outHop;
    for (let i = 0; i < grain; i++) out[dst + i] += x[src + i] * win[i];
  }
  let m = 0; for (let i = 0; i < out.length; i++) m = Math.max(m, Math.abs(out[i]));
  if (m > 0) { const g2 = 0.92 / m; for (let i = 0; i < out.length; i++) out[i] *= g2; }
  return out;
}

// Soft-clip saturation + lo-fi (bit/rate crush) used by the disintegrate iterator.
export function saturate(x: Float32Array, amount: number): Float32Array {
  const drive = 1 + amount * 6;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = Math.tanh(x[i] * drive) / Math.tanh(drive);
  return out;
}
export function lofi(x: Float32Array, bits: number, srDivide: number): Float32Array {
  const levels = Math.pow(2, Math.max(2, Math.min(16, bits)));
  const hold = Math.max(1, Math.floor(srDivide));
  const out = new Float32Array(x.length);
  let held = 0;
  for (let i = 0; i < x.length; i++) {
    if (i % hold === 0) held = Math.round(x[i] * levels) / levels;
    out[i] = held;
  }
  return out;
}
export function onePoleLp(x: Float32Array, sr: number, cutoffHz: number): Float32Array {
  const a = Math.exp((-TAU * Math.max(40, cutoffHz)) / sr);
  const out = new Float32Array(x.length);
  let y = 0;
  for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; out[i] = y; }
  return out;
}
export function smear(x: Float32Array, sr: number, ms: number): Float32Array {
  // short feedback-less multi-tap blur — softens transients each disintegration pass
  const d = Math.max(1, Math.floor((ms / 1000) * sr));
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = (x[i] + (x[i - d] ?? 0) * 0.6 + (x[i - 2 * d] ?? 0) * 0.35) / 1.95;
  return out;
}

// Write a 16-bit WAV plus a RIFF LIST/INFO metadata chunk (INAM title, IART artist, ICMT
// comment) — real embedded metadata, readable by players and DAWs.
export function writeWavWithInfo(path: string, samples: Float32Array, sr: number, info: { title?: string; artist?: string; comment?: string }): void {
  const base = encodeWav16(samples, sr);
  const entries: Buffer[] = [];
  const push = (id: string, text?: string) => {
    if (!text) return;
    const data = Buffer.from(text + "\0", "ascii");
    const padded = data.length % 2 ? Buffer.concat([data, Buffer.from([0])]) : data;
    const head = Buffer.alloc(8);
    head.write(id, 0, "ascii");
    head.writeUInt32LE(data.length, 4);
    entries.push(Buffer.concat([head, padded]));
  };
  push("INAM", info.title);
  push("IART", info.artist);
  push("ICMT", info.comment);
  if (!entries.length) { writeFileSync(path, base); return; }
  const listBody = Buffer.concat([Buffer.from("INFO", "ascii"), ...entries]);
  const listHead = Buffer.alloc(8);
  listHead.write("LIST", 0, "ascii");
  listHead.writeUInt32LE(listBody.length, 4);
  const full = Buffer.concat([base, listHead, listBody]);
  full.writeUInt32LE(full.length - 8, 4); // patch RIFF size
  writeFileSync(path, full);
}
