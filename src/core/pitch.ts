// Monophonic pitch tracking for Audio → MIDI (pure JS, no native deps).
// YIN-style cumulative-mean-normalized difference per frame, then segment
// consecutive frames of the same MIDI pitch into notes. Times come out in
// seconds; callers convert to beats with the song tempo.

export type PitchFrame = { tSec: number; hz: number; midi: number; rms: number };
export type DetectedNote = { pitch: number; startSec: number; durSec: number; rms: number };

const A4 = 440;
export function hzToMidi(hz: number): number {
  return Math.round(69 + 12 * Math.log2(hz / A4));
}

// One frame → fundamental frequency in Hz (0 if unvoiced), via YIN.
function yinFrame(frame: Float32Array, sampleRate: number, minHz: number, maxHz: number, threshold: number): number {
  const size = frame.length;
  const maxTau = Math.min(Math.floor(sampleRate / minHz), Math.floor(size / 2));
  const minTau = Math.max(2, Math.floor(sampleRate / maxHz));
  const diff = new Float32Array(maxTau + 1);
  for (let tau = minTau; tau <= maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i + tau < size; i++) { const d = frame[i] - frame[i + tau]; sum += d * d; }
    diff[tau] = sum;
  }
  // cumulative mean normalized difference
  const cmnd = new Float32Array(maxTau + 1);
  cmnd[minTau] = 1;
  let running = 0;
  for (let tau = minTau; tau <= maxTau; tau++) {
    running += diff[tau];
    cmnd[tau] = running > 0 ? diff[tau] * (tau - minTau + 1) / running : 1;
  }
  // absolute threshold: first dip below threshold, then refine to local min
  let tau = -1;
  for (let t = minTau; t <= maxTau; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 <= maxTau && cmnd[t + 1] < cmnd[t]) t++;
      tau = t; break;
    }
  }
  if (tau === -1) return 0;
  // parabolic interpolation around tau for sub-sample accuracy
  const x0 = tau > minTau ? tau - 1 : tau;
  const x2 = tau + 1 <= maxTau ? tau + 1 : tau;
  const s0 = cmnd[x0], s1 = cmnd[tau], s2 = cmnd[x2];
  const denom = s0 + s2 - 2 * s1;
  const better = denom !== 0 ? tau + (s0 - s2) / (2 * denom) : tau;
  return sampleRate / better;
}

export function trackPitches(samples: Float32Array, sampleRate: number, opts: {
  frameSize?: number; hop?: number; minHz?: number; maxHz?: number; threshold?: number; noiseFloor?: number;
} = {}): PitchFrame[] {
  const frameSize = opts.frameSize ?? 2048;
  const hop = opts.hop ?? 512;
  const minHz = opts.minHz ?? 65;     // ~C2
  const maxHz = opts.maxHz ?? 1200;   // ~D6
  const threshold = opts.threshold ?? 0.15;
  const noiseFloor = opts.noiseFloor ?? 0.012;
  const frames: PitchFrame[] = [];
  for (let start = 0; start + frameSize <= samples.length; start += hop) {
    const frame = samples.subarray(start, start + frameSize);
    let energy = 0;
    for (let i = 0; i < frame.length; i++) energy += frame[i] * frame[i];
    const rms = Math.sqrt(energy / frame.length);
    const tSec = start / sampleRate;
    if (rms < noiseFloor) { frames.push({ tSec, hz: 0, midi: -1, rms }); continue; }
    const hz = yinFrame(frame, sampleRate, minHz, maxHz, threshold);
    frames.push({ tSec, hz, midi: hz > 0 ? hzToMidi(hz) : -1, rms });
  }
  return frames;
}

// Segment frames into notes: median-smooth the pitch, then group consecutive
// equal-pitch frames, bridging short unvoiced gaps and dropping ultra-short blips.
export function framesToNotes(frames: PitchFrame[], opts: { hop: number; sampleRate: number; minDurSec?: number; maxGapSec?: number } ): DetectedNote[] {
  const minDur = opts.minDurSec ?? 0.06;
  const maxGap = opts.maxGapSec ?? 0.04;
  const hopSec = opts.hop / opts.sampleRate;
  // 3-frame median smoothing of midi (only over voiced frames)
  const midi = frames.map((f) => f.midi);
  const smooth = midi.map((_, i) => {
    const w = [midi[i - 1] ?? -1, midi[i], midi[i + 1] ?? -1].filter((m) => m >= 0).sort((a, b) => a - b);
    return w.length ? w[Math.floor(w.length / 2)] : -1;
  });
  const notes: DetectedNote[] = [];
  let cur: { pitch: number; startSec: number; endSec: number; rmsSum: number; n: number } | null = null;
  let gap = 0;
  for (let i = 0; i < frames.length; i++) {
    const p = smooth[i]; const f = frames[i];
    if (cur && p === cur.pitch) { cur.endSec = f.tSec + hopSec; cur.rmsSum += f.rms; cur.n++; gap = 0; continue; }
    if (cur && p < 0) { gap += hopSec; if (gap <= maxGap) continue; }
    if (cur) { const dur = cur.endSec - cur.startSec; if (dur >= minDur) notes.push({ pitch: cur.pitch, startSec: cur.startSec, durSec: dur, rms: cur.rmsSum / cur.n }); cur = null; }
    if (p >= 0) { cur = { pitch: p, startSec: f.tSec, endSec: f.tSec + hopSec, rmsSum: f.rms, n: 1 }; gap = 0; }
  }
  if (cur) { const dur = cur.endSec - cur.startSec; if (dur >= minDur) notes.push({ pitch: cur.pitch, startSec: cur.startSec, durSec: dur, rms: cur.rmsSum / cur.n }); }
  return notes;
}
