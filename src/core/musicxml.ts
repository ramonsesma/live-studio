// MusicXML 3.1 (partwise) export/import for MIDI notes — pure logic, no deps. The host has
// no DOM, so import is a small regex-based parser (best-effort, handles our own output + the
// common shape MuseScore/Sibelius emit). MusicXML is the portable bridge to notation editors,
// where the user can engrave and export PDF.
export interface XNote { pitch: number; startTime: number; duration: number; velocity?: number }

const DIV = 480; // divisions per quarter note
const STEP_PC = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
const SHARP: [string, number][] = [["C", 0], ["C", 1], ["D", 0], ["D", 1], ["E", 0], ["F", 0], ["F", 1], ["G", 0], ["G", 1], ["A", 0], ["A", 1], ["B", 0]];

function midiToPitch(p: number) { const pc = ((p % 12) + 12) % 12; const [step, alter] = SHARP[pc]; return { step, alter, octave: Math.floor(p / 12) - 1 }; }
function pitchToMidi(step: string, alter: number, octave: number) { const base = STEP_PC["CDEFGAB".indexOf(step)]; return (octave + 1) * 12 + base + (alter || 0); }

function durToType(divs: number): { type: string; dot: boolean } {
  const base: [number, string][] = [[1920, "whole"], [960, "half"], [480, "quarter"], [240, "eighth"], [120, "16th"], [60, "32nd"]];
  for (const [d, t] of base) if (Math.abs(divs - d) < 1) return { type: t, dot: false };
  for (const [d, t] of base) if (Math.abs(divs - d * 1.5) < 1) return { type: t, dot: true };
  let best = base[2]; for (const b of base) if (Math.abs(b[0] - divs) < Math.abs(best[0] - divs)) best = b;
  return { type: best[1], dot: false };
}
const esc = (s: string) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));

export function toMusicXML(notes: XNote[], opts: { tempo?: number; num?: number; den?: number; partName?: string } = {}): string {
  const num = opts.num || 4, den = opts.den || 4;
  const beatsPerMeasure = num * (4 / den);
  const measureDivs = Math.round(beatsPerMeasure * DIV);
  const q = (beats: number) => Math.max(120, Math.round((beats * DIV) / 120) * 120); // quantize to 16th
  const ns = notes.slice().sort((a, b) => a.startTime - b.startTime || a.pitch - b.pitch);
  const lastEnd = ns.length ? Math.max(...ns.map((n) => n.startTime + n.duration)) : beatsPerMeasure;
  const measureCount = Math.max(1, Math.ceil(lastEnd / beatsPerMeasure));

  let body = "";
  for (let m = 0; m < measureCount; m++) {
    const mStart = m * beatsPerMeasure, mEnd = mStart + beatsPerMeasure;
    // groups of simultaneous notes within this measure
    const inM = ns.filter((n) => n.startTime >= mStart - 1e-6 && n.startTime < mEnd - 1e-6);
    const groups: Record<string, XNote[]> = {};
    for (const n of inM) (groups[n.startTime.toFixed(4)] ||= []).push(n);
    const starts = Object.keys(groups).map(Number).sort((a, b) => a - b);
    let cursor = mStart, notesXml = "";
    const restXml = (divs: number) => { const { type, dot } = durToType(divs); return `<note><rest/><duration>${divs}</duration><voice>1</voice><type>${type}</type>${dot ? "<dot/>" : ""}</note>`; };
    for (const st of starts) {
      if (st > cursor + 1e-6) { notesXml += restXml(q(st - cursor)); cursor = st; }
      const g = groups[st.toFixed(4)].slice().sort((a, b) => a.pitch - b.pitch);
      const dur = Math.min(q(Math.min(...g.map((n) => n.duration))), measureDivs - Math.round((cursor - mStart) / beatsPerMeasure * measureDivs));
      const dur2 = Math.max(120, Math.min(q(Math.min(...g.map((n) => n.duration))), Math.round((mEnd - cursor) * DIV)));
      const { type, dot } = durToType(dur2);
      g.forEach((n, gi) => { const p = midiToPitch(n.pitch); notesXml += `<note>${gi ? "<chord/>" : ""}<pitch><step>${p.step}</step>${p.alter ? `<alter>${p.alter}</alter>` : ""}<octave>${p.octave}</octave></pitch><duration>${dur2}</duration><voice>1</voice><type>${type}</type>${dot ? "<dot/>" : ""}</note>`; });
      cursor += dur2 / DIV;
    }
    if (cursor < mEnd - 1e-6) notesXml += restXml(Math.max(120, Math.round((mEnd - cursor) * DIV)));
    const attrs = m === 0 ? `<attributes><divisions>${DIV}</divisions><key><fifths>0</fifths></key><time><beats>${num}</beats><beat-type>${den}</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${opts.tempo ? `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(opts.tempo)}</per-minute></metronome></direction-type></direction>` : ""}` : "";
    body += `<measure number="${m + 1}">${attrs}${notesXml}</measure>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n<score-partwise version="3.1"><part-list><score-part id="P1"><part-name>${esc(opts.partName || "Track")}</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
}

export function fromMusicXML(xml: string): { notes: XNote[]; num: number; den: number } {
  const divisions = Number((xml.match(/<divisions>\s*(\d+)\s*<\/divisions>/) || [])[1] || DIV);
  const num = Number((xml.match(/<beats>\s*(\d+)\s*<\/beats>/) || [])[1] || 4);
  const den = Number((xml.match(/<beat-type>\s*(\d+)\s*<\/beat-type>/) || [])[1] || 4);
  const notes: XNote[] = [];
  let cursor = 0, prevStart = 0, prevDur = 0;
  const noteRe = /<note\b[\s\S]*?<\/note>/g;
  let mt: RegExpExecArray | null;
  while ((mt = noteRe.exec(xml))) {
    const blk = mt[0];
    const dur = Number((blk.match(/<duration>\s*(\d+)\s*<\/duration>/) || [])[1] || 0);
    const beats = dur / divisions;
    const isChord = /<chord\s*\/>/.test(blk);
    if (/<rest\s*\/>/.test(blk)) { cursor += beats; continue; }
    const pm = blk.match(/<step>\s*([A-G])\s*<\/step>/);
    if (!pm) { cursor += beats; continue; }
    const step = pm[1];
    const alter = Number((blk.match(/<alter>\s*(-?\d+)\s*<\/alter>/) || [])[1] || 0);
    const octave = Number((blk.match(/<octave>\s*(-?\d+)\s*<\/octave>/) || [])[1] || 4);
    const start = isChord ? prevStart : cursor;
    notes.push({ pitch: pitchToMidi(step, alter, octave), startTime: start, duration: beats, velocity: 100 });
    if (!isChord) { prevStart = cursor; prevDur = beats; cursor += beats; }
    else if (beats > prevDur) { cursor = prevStart + beats; prevDur = beats; }
  }
  return { notes, num, den };
}
