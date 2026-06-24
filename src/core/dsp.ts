// Resonance — zero-dependency audio analysis for the Extension Host (Node).
// The host has no WHATWG/audio globals and the .ablx ships no native modules, so this is
// pure JS: WAV decode + radix-2 FFT + log-band spectrum + loudness. Fed by the WAV that
// resources.renderPreFxAudio() writes to disk.
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";

export interface DecodedAudio { sampleRate: number; channels: number; samples: Float32Array; }
export interface Band { f0: number; f1: number; db: number; norm: number; }
export interface Analysis {
  sampleRate: number; durationSec: number; frames: number;
  peakHz: number; rmsDb: number; peakDb: number; bands: Band[];
}

// --- WAV decode: PCM 16/24-bit and 32-bit float, mixed down to mono ---
export function decodeWav(buf: Buffer): DecodedAudio {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a RIFF/WAVE file");
  }
  let fmt: { audioFormat: number; channels: number; sampleRate: number; bits: number } | null = null;
  let dataOff = -1, dataLen = 0;
  let p = 12;
  while (p + 8 <= buf.length) {
    const id = buf.toString("ascii", p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    const body = p + 8;
    if (id === "fmt ") {
      fmt = { audioFormat: buf.readUInt16LE(body), channels: buf.readUInt16LE(body + 2), sampleRate: buf.readUInt32LE(body + 4), bits: buf.readUInt16LE(body + 14) };
    } else if (id === "data") {
      dataOff = body; dataLen = size;
    }
    p = body + size + (size & 1); // chunks are word-aligned
  }
  if (!fmt || dataOff < 0) throw new Error("Missing fmt/data chunk");
  const { channels, sampleRate, bits, audioFormat } = fmt;
  const bytesPerSample = bits >> 3;
  const frameCount = Math.floor(dataLen / (bytesPerSample * channels));
  const out = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    let acc = 0;
    for (let c = 0; c < channels; c++) {
      const o = dataOff + (i * channels + c) * bytesPerSample;
      let s: number;
      if (audioFormat === 3 && bits === 32) s = buf.readFloatLE(o);
      else if (bits === 16) s = buf.readInt16LE(o) / 32768;
      else if (bits === 24) { const v = buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16); s = ((v << 8) >> 8) / 8388608; }
      else if (bits === 32) s = buf.readInt32LE(o) / 2147483648;
      else throw new Error(`Unsupported bit depth: ${bits}`);
      acc += s;
    }
    out[i] = acc / channels;
  }
  return { sampleRate, channels, samples: out };
}

// --- radix-2 FFT (in place, iterative) ---
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len >> 1; k++) {
        const a = i + k, b = i + k + (len >> 1);
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

const LOW_HZ = 20, HIGH_HZ = 20000;

// Welch-style averaged magnitude spectrum over Hann-windowed frames.
export function analyzePcm(samples: Float32Array, sampleRate: number, opts: { fftSize?: number; bands?: number } = {}): Analysis {
  const fftSize = opts.fftSize ?? 4096;
  const nBands = opts.bands ?? 30;
  const half = fftSize >> 1;
  const mag = new Float64Array(half);
  let frames = 0;

  if (samples.length >= fftSize) {
    const hann = new Float64Array(fftSize);
    for (let i = 0; i < fftSize; i++) hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
    const hop = fftSize >> 1;
    for (let start = 0; start + fftSize <= samples.length; start += hop) {
      const re = new Float64Array(fftSize), im = new Float64Array(fftSize);
      for (let i = 0; i < fftSize; i++) re[i] = samples[start + i] * hann[i];
      fft(re, im);
      for (let k = 0; k < half; k++) mag[k] += Math.hypot(re[k], im[k]);
      frames++;
    }
    if (frames) for (let k = 0; k < half; k++) mag[k] /= frames;
  }

  // dominant frequency (skip DC bin)
  let peakBin = 1, peakVal = 0;
  for (let k = 1; k < half; k++) if (mag[k] > peakVal) { peakVal = mag[k]; peakBin = k; }
  const peakHz = (peakBin * sampleRate) / fftSize;

  // log-spaced bands
  const bands: Band[] = [];
  let maxDb = -Infinity;
  for (let b = 0; b < nBands; b++) {
    const f0 = LOW_HZ * Math.pow(HIGH_HZ / LOW_HZ, b / nBands);
    const f1 = LOW_HZ * Math.pow(HIGH_HZ / LOW_HZ, (b + 1) / nBands);
    const k0 = Math.max(1, Math.floor((f0 * fftSize) / sampleRate));
    const k1 = Math.min(half - 1, Math.ceil((f1 * fftSize) / sampleRate));
    let power = 0;
    for (let k = k0; k <= k1; k++) power += mag[k] * mag[k];
    const db = power > 0 ? 10 * Math.log10(power / Math.max(1, k1 - k0 + 1)) : -120;
    if (db > maxDb) maxDb = db;
    bands.push({ f0, f1, db, norm: 0 });
  }
  for (const band of bands) band.norm = Math.max(0, Math.min(1, (band.db - (maxDb - 60)) / 60));

  // loudness
  let sumSq = 0, peak = 0;
  for (let i = 0; i < samples.length; i++) { sumSq += samples[i] * samples[i]; const a = Math.abs(samples[i]); if (a > peak) peak = a; }
  const rms = samples.length ? Math.sqrt(sumSq / samples.length) : 0;
  const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -120;
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -120;

  return { sampleRate, durationSec: samples.length / sampleRate, frames, peakHz, rmsDb, peakDb, bands };
}

export function analyzeWavBuffer(buf: Buffer, opts?: { fftSize?: number; bands?: number }): Analysis {
  const { samples, sampleRate } = decodeWav(buf);
  return analyzePcm(samples, sampleRate, opts);
}
export function analyzeWavFile(path: string, opts?: { fftSize?: number; bands?: number }): Analysis {
  return analyzeWavBuffer(readFileSync(path), opts);
}

// --- test/demo helpers: synthesize PCM and a 16-bit WAV ---
export function synthPcm(sampleRate: number, durSec: number, parts: { hz: number; amp: number }[]): Float32Array {
  const n = Math.floor(sampleRate * durSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const p of parts) s += p.amp * Math.sin((2 * Math.PI * p.hz * i) / sampleRate);
    out[i] = s;
  }
  return out;
}
export function encodeWav16(samples: Float32Array, sampleRate: number): Buffer {
  const dataLen = samples.length * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0, "ascii"); buf.writeUInt32LE(36 + dataLen, 4); buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii"); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii"); buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  return buf;
}
