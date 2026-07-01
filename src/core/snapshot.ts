// Project Snapshot core — serialize the live Set to a plain JSON, diff two snapshots and
// restore one. Pure logic over the SDK object model (async because mixer/device params are
// read via getValue). Disk persistence lives in the Bridge (needs environment.storageDirectory).
import { history, keyTrack, recordNotes, recordParamAt, recordToggle } from "./history.js";

export interface Snapshot {
  version: number; label: string; timestamp: string;
  tempo: number | null;
  scale: { root: number | null; name: string | null; intervals: number[] | null };
  scenes: { name: string; num: number | null; den: number | null }[];
  cuePoints: { time: number; name: string }[];
  tracks: TrackSnap[];
}
interface TrackSnap {
  index: number; name: string; mute: boolean; solo: boolean; arm: boolean;
  devices: string[];
  mixer: { volume: number | null; pan: number | null; sends: number[] } | null;
  clips: ClipSnap[];
}
interface ClipSnap {
  slot: number; name: string; color: number | null; kind: "midi" | "audio";
  length: number | null; noteCount: number;
  notes?: { p: number; t: number; d: number; v: number }[];
  filePath?: string;
}

async function readMixer(m: any) {
  if (!m) return null;
  const volume = m.volume ? await m.volume.getValue() : null;
  const pan = m.panning ? await m.panning.getValue() : null;
  const sends = m.sends ? await Promise.all(m.sends.map((s: any) => s.getValue())) : [];
  return { volume, pan, sends };
}

export async function buildSnapshot(song: any, label = "snapshot"): Promise<Snapshot> {
  const tracks = song?.tracks || [];
  const out: Snapshot = {
    version: 1, label, timestamp: new Date().toISOString(),
    tempo: song?.tempo ?? null,
    scale: { root: song?.rootNote ?? null, name: song?.scaleName ?? null, intervals: Array.isArray(song?.scaleIntervals) ? song.scaleIntervals : null },
    scenes: (song?.scenes || []).map((s: any) => ({ name: s.name, num: s.signatureNumerator ?? null, den: s.signatureDenominator ?? null })),
    cuePoints: (song?.cuePoints || []).map((c: any) => ({ time: c.time, name: c.name })),
    tracks: [],
  };
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    const clips: ClipSnap[] = [];
    const slots = t.clipSlots || [];
    for (let s = 0; s < slots.length; s++) {
      const c = slots[s]?.clip; if (!c) continue;
      const isAudio = typeof c.filePath === "string";
      clips.push({
        slot: s, name: c.name, color: c.color ?? null, kind: isAudio ? "audio" : "midi",
        length: c.duration ?? null, noteCount: Array.isArray(c.notes) ? c.notes.length : 0,
        notes: !isAudio && Array.isArray(c.notes) ? c.notes.slice(0, 1000).map((n: any) => ({ p: n.pitch, t: n.startTime, d: n.duration, v: n.velocity ?? 100 })) : undefined,
        filePath: isAudio ? c.filePath : undefined,
      });
    }
    out.tracks.push({ index: i, name: t.name, mute: !!t.mute, solo: !!t.solo, arm: !!t.arm, devices: (t.devices || []).map((d: any) => d.name), mixer: await readMixer(t.mixer), clips });
  }
  return out;
}

export interface DiffLine { sign: "+" | "-" | "~"; text: string; }
const r2 = (n: any) => (typeof n === "number" ? Math.round(n * 100) / 100 : n);

export function diffSnapshots(a: Snapshot, b: Snapshot): { lines: DiffLine[]; counts: { added: number; removed: number; changed: number } } {
  const lines: DiffLine[] = [];
  if (a.tempo !== b.tempo) lines.push({ sign: "~", text: `tempo ${a.tempo} → ${b.tempo} BPM` });
  if (a.scale.name !== b.scale.name || a.scale.root !== b.scale.root) lines.push({ sign: "~", text: `scale ${a.scale.name ?? "?"} → ${b.scale.name ?? "?"}` });
  const byIdxA = new Map(a.tracks.map((t) => [t.index, t]));
  const byIdxB = new Map(b.tracks.map((t) => [t.index, t]));
  for (const t of b.tracks) if (!byIdxA.has(t.index)) lines.push({ sign: "+", text: `track ${t.index} "${t.name}" (${t.clips.length} clips)` });
  for (const t of a.tracks) if (!byIdxB.has(t.index)) lines.push({ sign: "-", text: `track ${t.index} "${t.name}"` });
  for (const tb of b.tracks) {
    const ta = byIdxA.get(tb.index); if (!ta) continue;
    const f: string[] = [];
    if (ta.name !== tb.name) f.push(`name "${ta.name}"→"${tb.name}"`);
    if (ta.mute !== tb.mute) f.push(`mute ${ta.mute ? "on" : "off"}→${tb.mute ? "on" : "off"}`);
    if (ta.solo !== tb.solo) f.push(`solo ${ta.solo ? "on" : "off"}→${tb.solo ? "on" : "off"}`);
    if (r2(ta.mixer?.volume) !== r2(tb.mixer?.volume)) f.push(`vol ${r2(ta.mixer?.volume)}→${r2(tb.mixer?.volume)}`);
    if (r2(ta.mixer?.pan) !== r2(tb.mixer?.pan)) f.push(`pan ${r2(ta.mixer?.pan)}→${r2(tb.mixer?.pan)}`);
    if (ta.devices.join(",") !== tb.devices.join(",")) f.push(`devices ${ta.devices.length}→${tb.devices.length}`);
    const an = ta.clips.reduce((s, c) => s + c.noteCount, 0), bn = tb.clips.reduce((s, c) => s + c.noteCount, 0);
    if (an !== bn) f.push(`notes ${an}→${bn}`);
    if (ta.clips.length !== tb.clips.length) f.push(`clips ${ta.clips.length}→${tb.clips.length}`);
    if (f.length) lines.push({ sign: "~", text: `"${tb.name}": ${f.join(", ")}` });
  }
  const counts = { added: lines.filter((l) => l.sign === "+").length, removed: lines.filter((l) => l.sign === "-").length, changed: lines.filter((l) => l.sign === "~").length };
  return { lines, counts };
}

// Every mutation is recorded to the shared Edit History first, so a bad restore can be undone
// with the regular undo_last/undo_target tools — same granularity as any other destructive edit.
export async function applySnapshot(song: any, snap: Snapshot): Promise<any> {
  let names = 0, mixers = 0, clips = 0, scenes = 0, markers = 0;
  if (snap.tempo != null && song && "tempo" in song && song.tempo !== snap.tempo) {
    recordToggle("song:tempo", "snapshot.restore(tempo)", () => song.tempo, (v) => { song.tempo = v; });
    try { song.tempo = snap.tempo; } catch {}
  }
  for (const ts of snap.tracks) {
    const t = song?.tracks?.[ts.index]; if (!t) continue;
    const prevState = { name: t.name, mute: t.mute, solo: t.solo };
    if (prevState.name !== ts.name || prevState.mute !== ts.mute || prevState.solo !== ts.solo) {
      recordToggle(keyTrack(ts.index), "snapshot.restore(track)", () => ({ name: t.name, mute: t.mute, solo: t.solo }), (v) => { t.name = v.name; t.mute = v.mute; t.solo = v.solo; });
      try { t.name = ts.name; t.mute = ts.mute; t.solo = ts.solo; names++; } catch {}
    }
    if (t.mixer && ts.mixer) {
      try {
        if (t.mixer.volume && ts.mixer.volume != null) { await recordParamAt(t.mixer.volume, keyTrack(ts.index), "snapshot.restore(volume)"); await t.mixer.volume.setValue(ts.mixer.volume); }
        if (t.mixer.panning && ts.mixer.pan != null) { await recordParamAt(t.mixer.panning, keyTrack(ts.index), "snapshot.restore(pan)"); await t.mixer.panning.setValue(ts.mixer.pan); }
        if (t.mixer.sends && ts.mixer.sends) for (let k = 0; k < t.mixer.sends.length && k < ts.mixer.sends.length; k++) { await recordParamAt(t.mixer.sends[k], keyTrack(ts.index), "snapshot.restore(send)"); await t.mixer.sends[k].setValue(ts.mixer.sends[k]); }
        mixers++;
      } catch {}
    }
    for (const cs of ts.clips) {
      if (cs.kind !== "midi" || !cs.notes) continue;
      const c = t.clipSlots?.[cs.slot]?.clip;
      if (c && Array.isArray(c.notes)) { recordNotes(c, ts.index, cs.slot, "snapshot.restore(notes)"); c.notes = cs.notes.map((n) => ({ pitch: n.p, startTime: n.t, duration: n.d, velocity: n.v })); clips++; }
    }
  }
  for (let i = 0; i < (snap.scenes || []).length; i++) {
    const sc = song?.scenes?.[i]; if (sc && "name" in sc && sc.name !== snap.scenes[i].name) {
      recordToggle(`scene:${i}`, "snapshot.restore(scene)", () => sc.name, (v) => { sc.name = v; });
      try { sc.name = snap.scenes[i].name; scenes++; } catch {}
    }
  }
  // Cue points: additive-only restore. We re-create any snapshotted marker missing from the
  // live Set (by name+time) — we never delete markers the user added since the snapshot, since
  // that's real user work, not something the snapshot has an opinion about. Undo deletes the
  // marker again; redo re-creates it (create/delete is a toggle too, just not a value swap).
  if (typeof song?.createCuePoint === "function") {
    const live = song.cuePoints || [];
    for (const cp of snap.cuePoints || []) {
      const exists = live.some((c: any) => c.name === cp.name && Math.abs(c.time - cp.time) < 0.01);
      if (exists) continue;
      try {
        let cue: any = await song.createCuePoint(cp.time);
        cue.name = cp.name;
        const toggle = async () => {
          if (cue) { try { await song.deleteCuePoint(cue); } catch {} cue = null; }
          else { try { cue = await song.createCuePoint(cp.time); cue.name = cp.name; } catch {} }
        };
        history.push("song:cuepoints", "snapshot.restore(marker)", toggle);
        markers++;
      } catch {}
    }
  }
  return { restored: true, tracksRestored: names, mixersRestored: mixers, clipsRestored: clips, scenesRestored: scenes, markersRestored: markers };
}

// Diff a saved snapshot against the Set's CURRENT live state without saving a new snapshot first
// — "what changed since this checkpoint?" without cluttering the snapshot list.
export async function diffAgainstCurrent(song: any, saved: Snapshot): Promise<{ lines: DiffLine[]; counts: { added: number; removed: number; changed: number } }> {
  const current = await buildSnapshot(song, "current");
  return diffSnapshots(saved, current);
}

export function summarize(s: Snapshot) {
  const notes = s.tracks.reduce((a, t) => a + t.clips.reduce((b, c) => b + c.noteCount, 0), 0);
  return { tracks: s.tracks.length, scenes: s.scenes.length, notes, tempo: s.tempo };
}
