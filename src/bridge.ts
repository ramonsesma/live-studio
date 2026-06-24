import { MasterRegistry } from "./core/registry.js";
import type { LLMClient, LLMMessage } from "./core/llm.js";
import { analyzeWavFile, analyzePcm, synthPcm, faderDbToValue, peakFrequencies, decodeWav, energyEnvelope, crossCorrelate, type Analysis } from "./core/dsp.js";
import { buildSnapshot, diffSnapshots, applySnapshot, summarize, type Snapshot } from "./core/snapshot.js";
import { extractFeatures, cosine, tagsFromName } from "./core/samplebrain.js";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";

const SYSTEM_PROMPT = `You are the Live Studio copilot, integrated into Ableton Live 12. You control Live with the full Live Studio toolset — 242 tools across 57 modules (session, chords, drums, eq, mixconsole, miditransform, randomizer, organizer, fxchain, …).

You don't see every tool up front. Use these three meta-tools to reach the whole toolset:
- find_tools(query): search the toolset by keywords and get matching tools with their exact name + parameters.
- list_modules(): browse the modules to discover what areas exist.
- run_tool(name, args): execute any tool by its exact name with its arguments.

WORKFLOW:
1. To learn the current set, run_tool("session__get_session_info") and run_tool("session__get_all_tracks").
2. For any task, find_tools with good keywords (e.g. "generate techno drums", "transpose clip", "save mix scene"), read the returned tool's parameters, then run_tool with the right args.
3. Track/clip indices start at 0. Use the most specific tool. If a tool fails, report the error and try an alternative.
4. Reply in the user's language and summarize what you did.`;

const MAX_ITERATIONS = 12;

// The compact toolkit the LLM actually sees. It discovers and runs the 242 real tools
// through these, so the per-call payload stays small and we never hit provider tool caps.
const META_TOOLS = [
  {
    name: "find_tools",
    description: "Search the Live Studio toolset by keywords. Returns matching tools with their exact name and parameters, ready to pass to run_tool.",
    parameters: {
      query: { type: "string", description: "Keywords describing what you want to do, e.g. 'generate house drums' or 'transpose midi clip'", required: true },
    },
  },
  {
    name: "list_modules",
    description: "List the Live Studio modules (id, label, description, tool count) to browse what areas of Live you can control.",
    parameters: {},
  },
  {
    name: "run_tool",
    description: "Execute a Live Studio tool by its exact name (from find_tools) with its arguments.",
    parameters: {
      name: { type: "string", description: "Exact tool name, e.g. 'drums__generate_pattern'", required: true },
      args: { type: "object", description: "Arguments object for the tool (per its parameters). Use {} if none.", required: false },
    },
  },
];

export interface ChatRequest {
  messages: LLMMessage[];
  systemPrompt?: string;
}
export interface ChatResponse {
  content: string;
  messages: LLMMessage[];
  toolCalls: number;
}

export interface ListenRequest { trackIndex?: number; startBeat?: number; endBeat?: number; wavPath?: string; demo?: boolean; }
export interface ListenResult { success: boolean; error?: string; data?: { source: string; trackName?: string; analysis: Analysis }; }

export class Bridge {
  // `resources`/`environment` come from the SDK ExtensionContext and are only present
  // inside Live; the analysis engine itself runs anywhere (used by /api/listen demo + tests).
  constructor(private registry: MasterRegistry, private song: any, private resources?: any, private environment?: any) {}

  getTools() { return this.registry.getDefinitionsJson(); }
  getModules() { return this.registry.getModules(); }

  async executeTool(name: string, args: Record<string, unknown>) {
    return this.registry.execute(name, args, this.song);
  }

  // Resonance "Listen" pipeline: render a stem to WAV (in Live) → FFT analyze in-host.
  async listen(req: ListenRequest): Promise<ListenResult> {
    try {
      if (req.demo) {
        // Synthetic stem (kick-ish 60Hz + body 220Hz + air 6kHz) so the path is provable
        // without Live. Same analyzer the real render path uses.
        const sr = 44100;
        const pcm = synthPcm(sr, 1, [{ hz: 60, amp: 0.8 }, { hz: 220, amp: 0.4 }, { hz: 6000, amp: 0.25 }]);
        return { success: true, data: { source: "demo", trackName: "Demo stem", analysis: analyzePcm(pcm, sr) } };
      }
      if (req.wavPath) {
        return { success: true, data: { source: "file", analysis: analyzeWavFile(req.wavPath) } };
      }
      if (req.trackIndex == null) return { success: false, error: "listen needs trackIndex, wavPath or demo:true" };
      const track = this.song?.tracks?.[req.trackIndex];
      if (!track) return { success: false, error: `Track ${req.trackIndex} not found` };
      if (!("createAudioClip" in track)) return { success: false, error: "Listen renders audio tracks. For a MIDI track, resample it to audio first." };
      if (!this.resources?.renderPreFxAudio) return { success: false, error: "Audio render is only available inside Live (resources.renderPreFxAudio)." };
      const start = req.startBeat ?? 0;
      const end = req.endBeat ?? Math.max(start + 4, start + 4);
      const wavPath: string = await this.resources.renderPreFxAudio(track, start, end);
      return { success: true, data: { source: "render", trackName: track.name, analysis: analyzeWavFile(wavPath) } };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  // Keyword search over every tool definition, ranked by how many query terms hit the
  // name/description/module. Returns compact, run_tool-ready entries.
  findTools(query: string, limit = 20) {
    const terms = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
    const defs = this.registry.getDefinitionsJson() as any[];
    const scored = defs.map((d) => {
      const hay = `${d.module} ${d.originalName || d.name} ${d.description}`.toLowerCase();
      let score = 0;
      for (const t of terms) if (hay.includes(t)) score += hay.includes(` ${t}`) || hay.startsWith(t) ? 2 : 1;
      return { d, score };
    }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
    return scored.map(({ d }) => ({
      name: d.name,
      description: d.description,
      module: d.module,
      parameters: Object.fromEntries(Object.entries(d.parameters || {}).map(([k, v]: [string, any]) => [k, { type: v.type, description: v.description, required: !!v.required, ...(v.enum ? { enum: v.enum } : {}) }])),
    }));
  }

  private async runMeta(name: string, args: any) {
    if (name === "find_tools") {
      const matches = this.findTools(String(args?.query || ""));
      return { success: true, data: { count: matches.length, tools: matches } };
    }
    if (name === "list_modules") {
      return { success: true, data: { modules: this.registry.getModules() } };
    }
    if (name === "run_tool") {
      if (!args?.name) return { success: false, error: "run_tool needs a 'name'." };
      return this.registry.execute(String(args.name), (args.args as Record<string, unknown>) || {}, this.song);
    }
    return { success: false, error: `Unknown meta-tool: ${name}` };
  }

  // Auto-Gain Stager: render each audio track pre-fx, measure RMS/peak (exact), then set
  // each fader to a reference level. renderPreFxAudio is pre-fader, so fader dB = target − source.
  async autoGain(req: { trackIndices?: number[]; targetMode?: string; startBeat?: number; endBeat?: number; apply?: boolean; demo?: boolean }): Promise<any> {
    try {
      const start = req.startBeat ?? 0, end = req.endBeat ?? 8;
      let rows: { index: number; name: string; rmsDb: number; peakDb: number }[] = [];
      if (req.demo) {
        rows = ["Kick", "Bass", "Gtr", "Vox", "Synth", "Perc"].map((name, i) => ({ index: i, name, rmsDb: [-8, -6, -15, -11, -20, -13][i], peakDb: [-1, -2, -8, -4, -12, -6][i] }));
      } else {
        const tracks = this.song?.tracks || [];
        const idxs = req.trackIndices?.length ? req.trackIndices : tracks.map((_: any, i: number) => i);
        if (!this.resources?.renderPreFxAudio) return { success: false, error: "Audio render is only available inside Live." };
        for (const i of idxs) {
          const t = tracks[i];
          if (!t || !("createAudioClip" in t)) continue; // audio tracks only
          const wav: string = await this.resources.renderPreFxAudio(t, start, end);
          const a = analyzeWavFile(wav);
          rows.push({ index: i, name: t.name, rmsDb: a.rmsDb, peakDb: a.peakDb });
        }
        if (!rows.length) return { success: false, error: "No audio tracks to analyze. Resample MIDI tracks to audio first." };
      }
      const finite = rows.filter((r) => isFinite(r.rmsDb));
      const mode = req.targetMode || "average";
      let targetDb: number;
      if (mode === "-18") targetDb = -18;
      else if (mode === "-12") targetDb = -12;
      else if (mode === "loudest") targetDb = Math.max(...finite.map((r) => r.rmsDb));
      else if (mode === "quietest") targetDb = Math.min(...finite.map((r) => r.rmsDb));
      else targetDb = finite.length ? finite.reduce((a, r) => a + r.rmsDb, 0) / finite.length : -18;
      const plan = rows.map((r) => {
        const faderDb = isFinite(r.rmsDb) ? Math.max(-24, Math.min(6, targetDb - r.rmsDb)) : 0;
        return { ...r, rmsDb: Number(r.rmsDb.toFixed(1)), peakDb: Number(r.peakDb.toFixed(1)), faderDb: Number(faderDb.toFixed(1)), faderValue: faderDbToValue(faderDb) };
      });
      let applied = false;
      if (req.apply && !req.demo) {
        for (const p of plan) { const vol = this.song?.tracks?.[p.index]?.mixer?.volume; if (vol?.setValue) await vol.setValue(p.faderValue); }
        applied = true;
      }
      return { success: true, data: { targetMode: mode, targetDb: Number(targetDb.toFixed(1)), applied, tracks: plan } };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  // Audio Texture Mapper: render an audio stem, window it, take the dominant spectral peak(s)
  // per window and turn them into MIDI notes (optionally snapped to Live's scale).
  async textureMap(req: { trackIndex?: number; startBeat?: number; endBeat?: number; noteCount?: number; polyphony?: number; snapScale?: boolean; demo?: boolean }): Promise<any> {
    try {
      const noteCount = Math.max(4, Math.min(64, req.noteCount || 16));
      const poly = Math.max(1, Math.min(4, req.polyphony || 1));
      const startBeat = req.startBeat ?? 0, endBeat = req.endBeat ?? 8;
      let samples: Float32Array, sampleRate: number, srcName = "Demo";
      if (req.demo) {
        sampleRate = 44100;
        const seg = Math.floor(sampleRate * 0.5), parts = [220, 277, 330, 440, 392, 494, 587, 659];
        samples = new Float32Array(seg * parts.length);
        parts.forEach((hz, si) => { for (let i = 0; i < seg; i++) samples[si * seg + i] = 0.6 * Math.sin((2 * Math.PI * hz * i) / sampleRate); });
      } else {
        const t = (this.song?.tracks || [])[req.trackIndex as number];
        if (!t) return { success: false, error: `Track ${req.trackIndex} not found` };
        if (!("createAudioClip" in t)) return { success: false, error: "Audio Texture Mapper reads audio tracks. Resample a MIDI track first." };
        if (!this.resources?.renderPreFxAudio) return { success: false, error: "Audio render is only available inside Live." };
        const wav: string = await this.resources.renderPreFxAudio(t, startBeat, endBeat);
        const dec = decodeWav(readFileSync(wav)); samples = dec.samples; sampleRate = dec.sampleRate; srcName = t.name;
      }
      const root = this.song?.rootNote, intervals = Array.isArray(this.song?.scaleIntervals) ? this.song.scaleIntervals : null;
      const scalePcs = req.snapScale && root != null && intervals ? intervals.map((i: number) => ((i + root) % 12)) : null;
      const snapPitch = (p: number) => { if (!scalePcs) return p; let best = p, bd = 99; for (let d = -6; d <= 6; d++) { const q = p + d; if (scalePcs.includes(((q % 12) + 12) % 12) && Math.abs(d) < bd) { best = q; bd = Math.abs(d); } } return best; };
      const NN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      const win = Math.max(2, Math.floor(samples.length / noteCount));
      const stepBeats = (endBeat - startBeat) / noteCount;
      const notes: any[] = [], preview: any[] = [];
      for (let i = 0; i < noteCount; i++) {
        const chunk = samples.subarray(i * win, (i + 1) * win);
        for (const pk of peakFrequencies(chunk, sampleRate, poly)) {
          if (pk.hz < 25) continue;
          let pitch = Math.round(69 + 12 * Math.log2(pk.hz / 440));
          if (pitch < 24 || pitch > 100) continue;
          pitch = snapPitch(pitch);
          const vel = Math.max(30, Math.min(120, Math.round(60 + Math.log10(pk.mag + 1) * 20)));
          notes.push({ pitch, startTime: startBeat + i * stepBeats, duration: stepBeats * 0.95, velocity: vel });
          preview.push({ pitch, name: NN[((pitch % 12) + 12) % 12] + (Math.floor(pitch / 12) - 1), start: Number((startBeat + i * stepBeats).toFixed(2)), hz: Math.round(pk.hz) });
        }
      }
      let trackIndex: number | null = null, clipName: string | null = null;
      if (!req.demo && notes.length && this.song?.createMidiTrack) {
        const nt = await this.song.createMidiTrack(); nt.name = `${srcName} → MIDI`;
        const clip = await nt.createMidiClip(0, Math.max(4, endBeat)); clip.name = `${srcName} texture`;
        clip.notes = notes; trackIndex = this.song.tracks.indexOf(nt); clipName = clip.name;
      }
      return { success: true, data: { source: req.demo ? "demo" : "render", srcName, noteCount: notes.length, snapped: !!scalePcs, trackIndex, clipName, notes: preview } };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  // Project Snapshot ("git for Live Sets"): serialize the whole Set to JSON on disk
  // (environment.storageDirectory), list, diff two snapshots, and restore one.
  private snapDir(): string {
    const base = this.environment?.storageDirectory || join(tmpdir(), "live-studio");
    const dir = join(base, ".snapshots");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }
  private loadSnap(dir: string, id: string): Snapshot | null {
    try { const p = join(dir, id + ".json"); return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null; } catch { return null; }
  }
  async snapshot(req: { action: string; label?: string; id?: string; idA?: string; idB?: string }): Promise<any> {
    try {
      const dir = this.snapDir();
      if (req.action === "save") {
        const snap = await buildSnapshot(this.song, req.label || "snapshot");
        const id = `${Date.now()}_${(req.label || "snap").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 24)}`;
        writeFileSync(join(dir, id + ".json"), JSON.stringify(snap));
        return { success: true, data: { id, timestamp: snap.timestamp, summary: summarize(snap) } };
      }
      if (req.action === "list") {
        const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
        const snapshots = files.map((f) => { try { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); return { id: f.replace(/\.json$/, ""), label: s.label, timestamp: s.timestamp, summary: summarize(s) }; } catch { return null; } })
          .filter(Boolean).sort((a: any, b: any) => (a.timestamp < b.timestamp ? 1 : -1));
        return { success: true, data: { snapshots, dir } };
      }
      if (req.action === "diff") {
        const a = this.loadSnap(dir, String(req.idA)), b = this.loadSnap(dir, String(req.idB));
        if (!a || !b) return { success: false, error: "Snapshot not found" };
        return { success: true, data: diffSnapshots(a, b) };
      }
      if (req.action === "restore") {
        const s = this.loadSnap(dir, String(req.id)); if (!s) return { success: false, error: "Snapshot not found" };
        return { success: true, data: await applySnapshot(this.song, s) };
      }
      if (req.action === "delete") {
        const p = join(dir, String(req.id) + ".json"); if (existsSync(p)) unlinkSync(p);
        return { success: true, data: { deleted: true } };
      }
      return { success: false, error: `Unknown snapshot action: ${req.action}` };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }

  // Write an exported document (MusicXML / SVG) to disk so the user can open it in a
  // notation editor (MuseScore/Sibelius/Dorico) and engrave/print a PDF.
  async scoreExport(req: { filename: string; content: string }): Promise<any> {
    try {
      const base = this.environment?.tempDirectory || join(tmpdir(), "live-studio");
      const dir = join(base, "scores");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const safe = String(req.filename || "score.musicxml").replace(/[^a-z0-9._-]+/gi, "_");
      const path = join(dir, safe);
      writeFileSync(path, req.content || "");
      return { success: true, data: { path } };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }

  // Stem Aligner: cross-correlate the energy envelopes of a guide and a target audio track
  // to find their time offset (Live has no such tool). Apply shifts the target clip (offset
  // only — the SDK can't write warp markers, so internal timing isn't stretched).
  async stemAlign(req: { guideIndex?: number; targetIndex?: number; startBeat?: number; endBeat?: number; demo?: boolean; apply?: boolean }): Promise<any> {
    try {
      const envHz = 100, maxLagSec = 2.5;
      let guideEnv: Float32Array, targetEnv: Float32Array, guideName = "Guide", targetName = "Target";
      if (req.demo) {
        const sr = 44100, dur = 3, delay = 0.27;
        const burst = (off: number) => { const s = new Float32Array(sr * dur); for (const on of [0, 0.5, 1.0, 1.5, 2.0]) { const start = Math.floor((on + off) * sr); for (let k = 0; k < Math.floor(0.08 * sr) && start + k < s.length; k++) s[start + k] = 0.8 * Math.sin((2 * Math.PI * 440 * k) / sr) * Math.exp(-k / (0.02 * sr)); } return s; };
        guideEnv = energyEnvelope(burst(0), sr, envHz); targetEnv = energyEnvelope(burst(delay), sr, envHz);
      } else {
        const tracks = this.song?.tracks || [];
        const g = tracks[req.guideIndex as number], t = tracks[req.targetIndex as number];
        if (!g || !t) return { success: false, error: "Guide/target track not found" };
        if (!("createAudioClip" in g) || !("createAudioClip" in t)) return { success: false, error: "Both guide and target must be audio tracks." };
        if (!this.resources?.renderPreFxAudio) return { success: false, error: "Audio render is only available inside Live." };
        const start = req.startBeat ?? 0, end = req.endBeat ?? 16;
        const gw = decodeWav(readFileSync(await this.resources.renderPreFxAudio(g, start, end)));
        const tw = decodeWav(readFileSync(await this.resources.renderPreFxAudio(t, start, end)));
        guideEnv = energyEnvelope(gw.samples, gw.sampleRate, envHz); targetEnv = energyEnvelope(tw.samples, tw.sampleRate, envHz);
        guideName = g.name; targetName = t.name;
      }
      const cc = crossCorrelate(targetEnv, guideEnv, Math.floor(maxLagSec * envHz));
      const offsetSec = cc.lag / envHz;
      const tempo = this.song?.tempo || 120;
      const offsetBeats = offsetSec * (tempo / 60);
      let applied = false, newStartBeats: number | null = null;
      if (req.apply && !req.demo) {
        const tt = this.song.tracks[req.targetIndex as number];
        const arr = (tt.arrangementClips || []).find((c: any) => typeof c.filePath === "string");
        if (arr && tt.createAudioClip && tt.deleteClip) {
          try { const fp = arr.filePath; newStartBeats = Math.max(0, (arr.startTime || 0) - offsetBeats); await tt.deleteClip(arr); await tt.createAudioClip({ filePath: fp, startTime: newStartBeats }); applied = true; } catch { /* best-effort */ }
        }
      }
      return { success: true, data: { guideName, targetName, offsetMs: Math.round(offsetSec * 1000), offsetBeats: Number(offsetBeats.toFixed(3)), confidence: Number(cc.score.toFixed(3)), applied, newStartBeats } };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }

  // Sample Library Brain: index audio samples (project clips + an optional folder of WAVs) to
  // a JSON index in storageDirectory with a perceptual fingerprint, then search by text/BPM/
  // key or "similar samples" (cosine distance) and drop one into the project.
  private brainPath(): string {
    const base = this.environment?.storageDirectory || join(tmpdir(), "live-studio");
    const dir = join(base, ".sample-brain"); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return join(dir, "index.json");
  }
  private loadBrain(): any { try { const p = this.brainPath(); return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : { samples: [] }; } catch { return { samples: [] }; } }

  async sampleBrain(req: any): Promise<any> {
    try {
      if (req.action === "index") {
        let entries: any[] = [];
        if (req.demo) {
          const sr = 44100;
          const make = (name: string, parts: { hz: number; a: number }[], dur: number) => { const s = new Float32Array(Math.floor(sr * dur)); for (let i = 0; i < s.length; i++) { let v = 0; for (const p of parts) v += p.a * Math.sin((2 * Math.PI * p.hz * i) / sr); s[i] = v; } return { name, path: `/demo/${name}`, samples: s }; };
          const demo = [make("deep_sub_kick.wav", [{ hz: 55, a: 0.8 }, { hz: 110, a: 0.3 }], 1.2), make("bright_hat_perc.wav", [{ hz: 6000, a: 0.5 }, { hz: 9000, a: 0.4 }], 0.5), make("warm_pad_Cmaj.wav", [{ hz: 261, a: 0.5 }, { hz: 329, a: 0.4 }, { hz: 392, a: 0.4 }], 3), make("bass_loop_124.wav", [{ hz: 80, a: 0.7 }, { hz: 160, a: 0.3 }], 4)];
          entries = demo.map((d) => ({ path: d.path, name: d.name, tags: tagsFromName(d.name), ...extractFeatures(d.samples, sr) }));
        } else {
          const paths = new Set<string>();
          if (req.folder && existsSync(req.folder)) for (const f of readdirSync(req.folder)) if (/\.wav$/i.test(f)) paths.add(join(req.folder, f));
          for (const t of this.song?.tracks || []) { for (const sl of t.clipSlots || []) { const c = sl?.clip; if (c && typeof c.filePath === "string") paths.add(c.filePath); } for (const c of t.arrangementClips || []) if (c && typeof c.filePath === "string") paths.add(c.filePath); }
          for (const p of paths) {
            const name = basename(p);
            if (!/\.wav$/i.test(p) || !existsSync(p)) { entries.push({ path: p, name, tags: tagsFromName(name), fingerprint: null, note: "non-WAV or missing — metadata only" }); continue; }
            try { const dec = decodeWav(readFileSync(p)); entries.push({ path: p, name, tags: tagsFromName(name), ...extractFeatures(dec.samples, dec.sampleRate) }); }
            catch { entries.push({ path: p, name, tags: tagsFromName(name), fingerprint: null, note: "decode failed" }); }
          }
        }
        writeFileSync(this.brainPath(), JSON.stringify({ version: 1, indexedAt: new Date().toISOString(), samples: entries }));
        return { success: true, data: { indexed: entries.length, withFeatures: entries.filter((e) => e.fingerprint).length } };
      }
      if (req.action === "search") {
        const idx = this.loadBrain().samples || [];
        let rows = idx.slice();
        if (req.similarTo) { const ref = idx.find((s: any) => s.path === req.similarTo); if (ref?.fingerprint) rows = rows.filter((s: any) => s.fingerprint).map((s: any) => ({ ...s, score: cosine(ref.fingerprint, s.fingerprint) })).sort((a: any, b: any) => b.score - a.score); }
        const q = (req.query || "").toLowerCase();
        if (q) rows = rows.filter((s: any) => `${s.name} ${(s.tags || []).join(" ")} ${s.path}`.toLowerCase().includes(q));
        if (req.bpmMin != null) rows = rows.filter((s: any) => s.bpm != null && s.bpm >= req.bpmMin);
        if (req.bpmMax != null) rows = rows.filter((s: any) => s.bpm != null && s.bpm <= req.bpmMax);
        if (req.key) rows = rows.filter((s: any) => (s.key || "").toLowerCase().includes(String(req.key).toLowerCase()));
        return { success: true, data: { total: idx.length, count: rows.length, samples: rows.slice(0, req.limit || 60).map((s: any) => ({ path: s.path, name: s.name, tags: s.tags, duration: s.duration, bpm: s.bpm, key: s.key, brightness: s.brightness, score: s.score != null ? Number(s.score.toFixed(3)) : undefined })) } };
      }
      if (req.action === "drop") {
        if (!this.resources?.importIntoProject) return { success: false, error: "Import is only available inside Live." };
        const imported = await this.resources.importIntoProject(req.path);
        const track = req.trackIndex != null ? this.song.tracks[req.trackIndex] : await this.song.createAudioTrack();
        if (!track || !("createAudioClip" in track)) return { success: false, error: "Need an audio track." };
        await track.createAudioClip({ filePath: imported, startTime: 0 });
        return { success: true, data: { dropped: true, trackIndex: this.song.tracks.indexOf(track), path: imported } };
      }
      return { success: false, error: `Unknown sample-brain action: ${req.action}` };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }

  async processChat(req: ChatRequest, client: LLMClient): Promise<ChatResponse> {
    const prompt = req.systemPrompt || SYSTEM_PROMPT;
    const messages: LLMMessage[] = [{ role: "system", content: prompt }, ...req.messages];
    let totalToolCalls = 0;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await client.chat(messages, META_TOOLS);

      if (response.toolCalls.length === 0) {
        messages.push({ role: "assistant", content: response.content });
        return { content: response.content, messages: this.trim(messages), toolCalls: totalToolCalls };
      }

      totalToolCalls += response.toolCalls.length;
      messages.push({
        role: "assistant",
        content: response.content,
        tool_calls: response.toolCalls.map((tc) => ({ id: tc.id, type: "function" as const, function: { name: tc.name, arguments: JSON.stringify(tc.arguments) } })),
      });

      for (const tc of response.toolCalls) {
        const result = await this.runMeta(tc.name, tc.arguments);
        messages.push({ role: "tool", content: JSON.stringify(result), tool_call_id: tc.id });
      }
    }

    return { content: "Max iterations reached. Please simplify your request.", messages: this.trim(messages), toolCalls: totalToolCalls };
  }

  private trim(messages: LLMMessage[]): LLMMessage[] {
    if (messages.length <= 24) return messages;
    return [messages[0], { role: "user", content: "[history truncated]" }, ...messages.slice(-12)];
  }
}
