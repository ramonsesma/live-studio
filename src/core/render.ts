// Render a MIDI clip's notes through any in-host synth engine. Takes a list of notes (pitch,
// startBeat, durBeats, velocity), tempo and an "instrument" function (note → mono Float32Array
// for that pitch), and mixes them into a single audio buffer (notes overlap correctly).

export type RenderNote = { pitch: number; startBeat: number; durBeats: number; velocity?: number };
export type InstrumentFn = (note: RenderNote, sr: number) => Float32Array;

export function renderMidi(notes: RenderNote[], tempo: number, instrument: InstrumentFn, sr = 44100): Float32Array {
  if (!notes.length) return new Float32Array(0);
  const spb = 60 / Math.max(1, tempo);
  const tailSec = 1.5; // leave room for releases / decays
  const totalSec = Math.max(...notes.map((n) => (n.startBeat + Math.max(0.05, n.durBeats)) * spb)) + tailSec;
  const total = Math.floor(sr * totalSec);
  const out = new Float32Array(total);
  for (const n of notes) {
    const buf = instrument(n, sr);
    const start = Math.floor(n.startBeat * spb * sr);
    const v = Math.max(0, Math.min(1.2, (n.velocity ?? 100) / 127));
    for (let i = 0; i < buf.length && start + i < total; i++) out[start + i] += buf[i] * v;
  }
  let m = 0; for (let i = 0; i < total; i++) { const a = Math.abs(out[i]); if (a > m) m = a; }
  if (m > 1) { const g = 0.96 / m; for (let i = 0; i < total; i++) out[i] *= g; }
  return out;
}

// Extract notes from a clip-shape (clipSlots[i].clip or arrangementClips[i]) in our MIDI format.
export function clipToNotes(clip: any): RenderNote[] {
  if (!clip || !Array.isArray(clip.notes)) return [];
  return clip.notes.map((n: any) => ({ pitch: n.pitch, startBeat: n.startTime, durBeats: n.duration, velocity: n.velocity }));
}
