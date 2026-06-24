// Sample Library Brain — perceptual feature extraction for audio samples, pure JS over our
// own FFT (no native deps, no sqlite). Produces a JSON-friendly fingerprint used to search
// "similar samples" (cosine distance), plus a rough BPM and key guess and timbral brightness.
import { analyzePcm, peakFrequencies, energyEnvelope } from "./dsp.js";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function pearson(a: number[], b: number[]): number {
  const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}
function detectKey(chroma: number[]) {
  let best = { key: "—", score: -1 };
  for (let t = 0; t < 12; t++) {
    const m = MAJOR.map((_, i) => MAJOR[(i - t + 12) % 12]), n = MINOR.map((_, i) => MINOR[(i - t + 12) % 12]);
    const sm = pearson(chroma, m), sn = pearson(chroma, n);
    if (sm > best.score) best = { key: `${NOTE_NAMES[t]} major`, score: sm };
    if (sn > best.score) best = { key: `${NOTE_NAMES[t]} minor`, score: sn };
  }
  return best;
}

function estimateBpm(samples: Float32Array, sampleRate: number): number | null {
  if (samples.length < sampleRate) return null; // too short for a tempo
  const env = energyEnvelope(samples, sampleRate, 100);
  const onset = new Float32Array(env.length);
  for (let i = 1; i < env.length; i++) onset[i] = Math.max(0, env[i] - env[i - 1]);
  let best = 0, bestLag = 0;
  for (let bpm = 70; bpm <= 180; bpm++) { const lag = Math.round((60 / bpm) * 100); let s = 0; for (let i = lag; i < onset.length; i++) s += onset[i] * onset[i - lag]; if (s > best) { best = s; bestLag = lag; } }
  return best > 0 && bestLag > 0 ? Math.round(60 / (bestLag / 100)) : null;
}

export interface SampleFeatures {
  duration: number; sampleRate: number; bpm: number | null;
  key: string; keyConfidence: number; brightness: number; fingerprint: number[];
}

export function extractFeatures(samples: Float32Array, sampleRate: number): SampleFeatures {
  const a = analyzePcm(samples, sampleRate, { fftSize: 4096, bands: 24 });
  const fingerprint = a.bands.map((b) => Number(b.norm.toFixed(3)));
  let cw = 0, cs = 0;
  a.bands.forEach((b) => { const c = Math.sqrt(b.f0 * b.f1); cw += b.norm * c; cs += b.norm; });
  const brightness = cs ? Math.round(cw / cs) : 0;
  const chroma = new Array(12).fill(0);
  for (const pk of peakFrequencies(samples, sampleRate, 40)) { if (pk.hz < 25) continue; chroma[(Math.round(69 + 12 * Math.log2(pk.hz / 440)) % 12 + 12) % 12] += pk.mag; }
  const k = detectKey(chroma);
  return { duration: Number(a.durationSec.toFixed(2)), sampleRate, bpm: estimateBpm(samples, sampleRate), key: k.key, keyConfidence: Number(Math.max(0, k.score).toFixed(2)), brightness, fingerprint };
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0; const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function tagsFromName(name: string): string[] {
  return name.replace(/\.[a-z0-9]+$/i, "").split(/[\s_\-.]+/).map((s) => s.toLowerCase()).filter((s) => s.length > 1 && !/^\d+$/.test(s)).slice(0, 8);
}
