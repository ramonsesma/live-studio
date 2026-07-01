import { MasterRegistry } from "./core/registry.js";
import type { LLMClient, LLMMessage } from "./core/llm.js";
import { analyzeWavFile, analyzePcm, synthPcm, faderDbToValue, peakFrequencies, decodeWav, encodeWav16, energyEnvelope, crossCorrelate, detectOnsets, type Analysis } from "./core/dsp.js";
import { trackPitches, framesToNotes } from "./core/pitch.js";
import { olaStretch, varispeed, wavePeaks } from "./core/stretch.js";
import { synthDrum } from "./core/drumsynth.js";
import { sliceBuffer, applyFx, assemble, mulberry32, type SliceFx } from "./core/slicefx.js";
import { synthRiser } from "./core/riser.js";
import { synth808 } from "./core/sub808.js";
import { synthPad } from "./core/pad.js";
import { synthPluck } from "./core/pluck.js";
import { synthAcid } from "./core/acid303.js";
import { synthStab } from "./core/chordstab.js";
import { synthBell } from "./core/fmbell.js";
import { synthImpact } from "./core/impact.js";
import { setStorageDir } from "./core/storage.js";
import { synthSubBass } from "./core/subbass.js";
import { synthOrgan } from "./core/organ.js";
import { synthVocalChop } from "./core/vocalchop.js";
import { renderMidi, clipToNotes, type RenderNote } from "./core/render.js";
import { synthBrass } from "./core/brass.js";
import { synthWobble } from "./core/wobble.js";
import { synthChoir } from "./core/choir.js";
import { synthSubDrop } from "./core/subdrop.js";
import { synthPluckBass } from "./core/pluckbass.js";
import { synthSawLead } from "./core/sawlead.js";
import { synthReese } from "./core/reese.js";
import { synthMarimba } from "./core/marimba.js";
import { synthGlitch } from "./core/glitch.js";
import { synthTapeHiss } from "./core/tapehiss.js";
import { synthTrumpet } from "./core/trumpet.js";
import { synthEPiano } from "./core/epiano.js";
import { synthMusicBox } from "./core/musicbox.js";
import { synthHarp } from "./core/harp.js";
import { synthWhistle } from "./core/whistle.js";
import { synthSubWobble } from "./core/subwobble.js";
import { synthVocoder } from "./core/vocoder.js";
import { synthNoiseFX } from "./core/noisefx.js";
import { synthCymbal } from "./core/cymbal.js";
import { synthGuitar } from "./core/guitar.js";
import { synthSitar } from "./core/sitar.js";
import { synthSteelDrum } from "./core/steeldrum.js";
import { synthAccordion } from "./core/accordion.js";
import { synthTheremin } from "./core/theremin.js";
import { synthHiHat808 } from "./core/hihat808.js";
import { synthStabHit } from "./core/stabhit.js";
import { synthGlassBell } from "./core/glassbell.js";
import { synthSubKick } from "./core/subkick.js";
import { synthReverseSweep } from "./core/reversesweep.js";
import { recordNotes } from "./core/history.js";
import { buildSnapshot, diffSnapshots, applySnapshot, summarize, type Snapshot } from "./core/snapshot.js";
import { extractFeatures, cosine, tagsFromName, estimateBpm } from "./core/samplebrain.js";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, unlinkSync, copyFileSync } from "node:fs";
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
  constructor(private registry: MasterRegistry, private song: any, private resources?: any, private environment?: any) { try { setStorageDir(environment?.storageDirectory); } catch {} }

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

  // Audio → MIDI Melody: render the track's pre-FX audio, YIN pitch-track it, segment into
  // notes, convert seconds→beats with song.tempo and (optionally) write a new MIDI clip.
  async audioToMidi(req: { trackIndex?: number; startBeat?: number; endBeat?: number; noiseFloor?: number; minDurMs?: number; write?: boolean; demo?: boolean }): Promise<any> {
    try {
      const startBeat = req.startBeat ?? 0, endBeat = req.endBeat ?? 8;
      const tempo = this.song?.tempo || 120;
      const secPerBeat = 60 / tempo;
      let samples: Float32Array, sampleRate: number, srcName = "Demo";
      if (req.demo) {
        sampleRate = 44100;
        const seq = [60, 64, 67, 72, 67, 64];
        const noteSec = 0.45, gapSec = 0.05;
        samples = new Float32Array(Math.floor(sampleRate * seq.length * (noteSec + gapSec)));
        let off = 0;
        for (const m of seq) { const hz = 440 * Math.pow(2, (m - 69) / 12); const n = Math.floor(sampleRate * noteSec); for (let i = 0; i < n; i++) { const env = Math.min(1, i / 500) * Math.min(1, (n - i) / 500); samples[off + i] = 0.6 * env * Math.sin((2 * Math.PI * hz * i) / sampleRate); } off += Math.floor(sampleRate * (noteSec + gapSec)); }
        srcName = "Demo melody";
      } else {
        const t = (this.song?.tracks || [])[req.trackIndex as number];
        if (!t) return { success: false, error: `Track ${req.trackIndex} not found` };
        if (!("createAudioClip" in t)) return { success: false, error: "Audio → MIDI reads audio tracks. Resample a MIDI track first." };
        if (!this.resources?.renderPreFxAudio) return { success: false, error: "Audio render is only available inside Live." };
        const wav: string = await this.resources.renderPreFxAudio(t, startBeat, endBeat);
        const dec = decodeWav(readFileSync(wav)); samples = dec.samples; sampleRate = dec.sampleRate; srcName = t.name;
      }
      const hop = 512;
      const frames = trackPitches(samples, sampleRate, { hop, noiseFloor: req.noiseFloor ?? 0.012 });
      const det = framesToNotes(frames, { hop, sampleRate, minDurSec: (req.minDurMs ?? 60) / 1000 });
      const NN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      const notes = det.map((n) => ({ pitch: n.pitch, startTime: startBeat + n.startSec / secPerBeat, duration: Math.max(0.05, n.durSec / secPerBeat), velocity: Math.max(20, Math.min(120, Math.round(40 + n.rms * 400))) }));
      const preview = notes.map((n) => ({ pitch: n.pitch, name: NN[((n.pitch % 12) + 12) % 12] + (Math.floor(n.pitch / 12) - 1), start: Number(n.startTime.toFixed(3)), dur: Number(n.duration.toFixed(3)), vel: n.velocity }));
      let trackIndex: number | null = null, clipName: string | null = null;
      if (!req.demo && req.write !== false && notes.length && this.song?.createMidiTrack) {
        const span = Math.max(4, ...notes.map((n) => n.startTime + n.duration));
        const nt = await this.song.createMidiTrack(); nt.name = `${srcName} → MIDI`;
        const clip = await nt.createMidiClip(0, span); clip.name = `${srcName} transcription`;
        clip.notes = notes; trackIndex = this.song.tracks.indexOf(nt); clipName = clip.name;
      }
      return { success: true, data: { source: req.demo ? "demo" : "render", srcName, tempo, frames: frames.length, noteCount: notes.length, trackIndex, clipName, notes: preview } };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  // Drum synthesis: render a kick/snare/clap/hat with our in-host DSP, write a WAV (served for
  // audition), and import it as a new clip. Non-destructive — produces a fresh sample.
  async synthDrum(req: { type?: string; params?: any; import?: boolean; demo?: boolean }): Promise<any> {
    try {
      const type = ["kick", "snare", "clap", "hat"].includes(req.type as string) ? (req.type as string) : "kick";
      const sr = 44100;
      const samples = synthDrum(type, req.params || {}, sr);
      const base = this.environment?.tempDirectory || join(tmpdir(), "live-studio");
      const dir = join(base, "drumsynth"); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const id = `${type}_${Date.now()}`; const file = join(dir, id + ".wav");
      writeFileSync(file, encodeWav16(samples, sr));
      let importedPath: string | null = null;
      if (req.import !== false && !req.demo && this.resources?.importIntoProject) { try { importedPath = await this.resources.importIntoProject(file); } catch { importedPath = null; } }
      return { success: true, data: { type, durSec: Number((samples.length / sr).toFixed(3)), sampleRate: sr, file, importedPath, audio: `/api/drumsynthaudio?id=${id}`, wave: wavePeaks(samples, 240) } };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }
  drumAudio(id: string): Buffer | null {
    try { const base = this.environment?.tempDirectory || join(tmpdir(), "live-studio"); const safe = String(id).replace(/[^a-z0-9_]/gi, ""); const p = join(base, "drumsynth", safe + ".wav"); return existsSync(p) ? readFileSync(p) : null; } catch { return null; }
  }

  // Generic served-audio cache for Slice Lab / Mosaic / Riser: write a WAV, return an /api/audioout URL.
  private writeServed(samples: Float32Array, sr: number, prefix: string): { id: string; file: string; url: string } {
    const base = this.environment?.tempDirectory || join(tmpdir(), "live-studio");
    const dir = join(base, "audioout"); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const id = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
    const file = join(dir, id + ".wav");
    writeFileSync(file, encodeWav16(samples, sr));
    return { id, file, url: `/api/audioout?id=${id}` };
  }
  servedAudio(id: string): Buffer | null {
    try { const base = this.environment?.tempDirectory || join(tmpdir(), "live-studio"); const safe = String(id).replace(/[^a-z0-9_]/gi, ""); const p = join(base, "audioout", safe + ".wav"); return existsSync(p) ? readFileSync(p) : null; } catch { return null; }
  }
  // Read a clip's source audio (filePath, else render the track). Returns null if unavailable.
  private async readClipAudio(trackIndex: number, clipIndex: number): Promise<{ samples: Float32Array; sampleRate: number; name: string } | null> {
    const t = (this.song?.tracks || [])[trackIndex];
    if (!t) return null;
    const clip = t.clipSlots?.[clipIndex ?? 0]?.clip ?? t.arrangementClips?.[clipIndex ?? 0];
    if (clip && typeof clip.filePath === "string" && clip.filePath && existsSync(clip.filePath)) {
      const dec = decodeWav(readFileSync(clip.filePath)); return { samples: dec.samples, sampleRate: dec.sampleRate, name: clip.name || basename(clip.filePath) };
    }
    if (this.resources?.renderPreFxAudio && "createAudioClip" in t) {
      const start = clip?.startTime ?? 0; const dec = decodeWav(readFileSync(await this.resources.renderPreFxAudio(t, start, start + (clip?.duration ?? 4)))); return { samples: dec.samples, sampleRate: dec.sampleRate, name: t.name };
    }
    return null;
  }
  private demoAudio(sr: number): Float32Array {
    const x = new Float32Array(Math.floor(sr * 2));
    for (let i = 0; i < x.length; i++) { const t = i / sr; const seg = Math.floor(t * 4) % 4; const f = [220, 330, 165, 440][seg]; x[i] = 0.5 * Math.sin(2 * Math.PI * f * t) * (0.3 + 0.7 * Math.abs(Math.sin(Math.PI * t * 2))); }
    return x;
  }

  // Slice Lab: slice a clip's audio and reorder/process each step with pattern lanes → a new loop.
  async sliceMutate(req: { trackIndex?: number; clipIndex?: number; slices?: number; lanes?: any; filter?: any; crossfade?: number; import?: boolean; demo?: boolean }): Promise<any> {
    try {
      const sr = 44100;
      let samples: Float32Array, name = "Demo";
      if (req.demo) { samples = this.demoAudio(sr); name = "Demo loop"; }
      else { const a = await this.readClipAudio(req.trackIndex as number, req.clipIndex ?? 0); if (!a) return { success: false, error: "Select an audio clip (needs a sample file or renderable track)." }; samples = a.samples; name = a.name; }
      const n = Math.max(2, Math.min(32, req.slices || 8));
      const slices = sliceBuffer(samples, n);
      const lanes = req.lanes || {};
      const order: number[] = Array.isArray(lanes.order) && lanes.order.length ? lanes.order : Array.from({ length: n }, (_, i) => i);
      const at = (arr: any, i: number, d: any) => (Array.isArray(arr) && arr.length ? arr[i % arr.length] : d);
      const processed = order.map((src: number, pos: number) => {
        const fx: SliceFx = { reverse: !!at(lanes.reverse, pos, 0), stutter: at(lanes.stutter, pos, 0), pitch: at(lanes.pitch, pos, 0), tapestop: !!at(lanes.tapestop, pos, 0), bitcrush: at(lanes.bitcrush, pos, 16), flanger: !!at(lanes.flanger, pos, 0), gatereverb: !!at(lanes.gatereverb, pos, 0), filter: !!at(lanes.filter, pos, 0), filterMode: (req.filter?.mode) || "lp", cutoff: req.filter?.cutoff ?? 1200, res: req.filter?.res ?? 0.3, sweep: req.filter?.sweep ?? 0 };
        return applyFx((slices[((src % n) + n) % n] || slices[0]).slice(), fx, sr);
      });
      const result = assemble(processed, Math.max(0, Math.min(2000, req.crossfade ?? 0)));
      const served = this.writeServed(result, sr, "slice");
      let importedPath: string | null = null;
      if (req.import !== false && !req.demo && this.resources?.importIntoProject) { try { importedPath = await this.resources.importIntoProject(served.file); } catch { importedPath = null; } }
      return { success: true, data: { source: req.demo ? "demo" : "clip", name, slices: n, order, sampleRate: sr, inSec: Number((samples.length / sr).toFixed(2)), outSec: Number((result.length / sr).toFixed(2)), audio: served.url, importedPath, waveIn: wavePeaks(samples, 240), waveOut: wavePeaks(result, 240) } };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }

  // Mosaic: generative — slice the source and assemble N seeded variations with chance-based FX.
  async mosaicGen(req: { trackIndex?: number; clipIndex?: number; slices?: number; variations?: number; crossfade?: number; seed?: number; chances?: any; filter?: any; import?: boolean; demo?: boolean }): Promise<any> {
    try {
      const sr = 44100;
      let samples: Float32Array, name = "Demo";
      if (req.demo) { samples = this.demoAudio(sr); name = "Demo source"; }
      else { const a = await this.readClipAudio(req.trackIndex as number, req.clipIndex ?? 0); if (!a) return { success: false, error: "Select an audio clip or renderable track." }; samples = a.samples; name = a.name; }
      const n = Math.max(2, Math.min(32, req.slices || 8));
      const slices = sliceBuffer(samples, n);
      const count = Math.max(1, Math.min(8, req.variations || 4));
      const ch = req.chances || {};
      const c = (k: string, d: number) => (typeof ch[k] === "number" ? ch[k] : d) / 100;
      const out: any[] = [];
      for (let v = 0; v < count; v++) {
        const rng = mulberry32((req.seed ?? 1) + v * 101);
        const order = Array.from({ length: n }, (_, i) => i).sort(() => rng() - 0.5);
        const processed = order.map((src) => {
          const fx: SliceFx = { reverse: rng() < c("reverse", 25), stutter: rng() < c("stutter", 20) ? 2 + Math.floor(rng() * 3) : 0, pitch: rng() < c("pitch", 20) ? Math.round((rng() * 2 - 1) * 7) : 0, tapestop: rng() < c("tapestop", 10), filter: rng() < c("filter", 30), filterMode: ["lp", "bp", "hp"][Math.floor(rng() * 3)], cutoff: 400 + rng() * 4000, res: 0.2 + rng() * 0.5, sweep: rng() * 2 - 1, bitcrush: rng() < c("bitcrush", 15) ? 4 + Math.floor(rng() * 8) : 16, flanger: rng() < c("flanger", 15), gatereverb: rng() < c("gatereverb", 12) };
          return applyFx((slices[src] || slices[0]).slice(), fx, sr);
        });
        const result = assemble(processed, Math.max(0, Math.min(2000, req.crossfade ?? 64)));
        const served = this.writeServed(result, sr, `mosaic${v}`);
        let importedPath: string | null = null;
        if (req.import !== false && !req.demo && this.resources?.importIntoProject) { try { importedPath = await this.resources.importIntoProject(served.file); } catch { importedPath = null; } }
        out.push({ variation: v + 1, seed: (req.seed ?? 1) + v * 101, order, audio: served.url, importedPath, wave: wavePeaks(result, 200), outSec: Number((result.length / sr).toFixed(2)) });
      }
      return { success: true, data: { source: req.demo ? "demo" : "clip", name, slices: n, variations: out.length, results: out } };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }

  // 808: synthesize a tuned 808/sub from params, serve it for audition and import as a new clip.
  async synth808Gen(req: { params?: any; import?: boolean; demo?: boolean }): Promise<any> {
    try {
      const sr = 44100;
      const samples = synth808(req.params || {}, sr);
      const served = this.writeServed(samples, sr, "sub808");
      let importedPath: string | null = null;
      if (req.import !== false && !req.demo && this.resources?.importIntoProject) { try { importedPath = await this.resources.importIntoProject(served.file); } catch { importedPath = null; } }
      return { success: true, data: { note: req.params?.note ?? 24, durSec: Number((samples.length / sr).toFixed(2)), sampleRate: sr, audio: served.url, importedPath, wave: wavePeaks(samples, 260) } };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }

  // Generic in-host synth → served WAV + import, shared by the acid/stab/bell/impact engines.
  private async synthImport(fn: (p: any, sr: number) => Float32Array, prefix: string, req: { params?: any; import?: boolean; demo?: boolean }, extra: any = {}): Promise<any> {
    try {
      const sr = 44100;
      const samples = fn(req.params || {}, sr);
      const served = this.writeServed(samples, sr, prefix);
      let importedPath: string | null = null;
      if (req.import !== false && !req.demo && this.resources?.importIntoProject) { try { importedPath = await this.resources.importIntoProject(served.file); } catch { importedPath = null; } }
      return { success: true, data: { durSec: Number((samples.length / sr).toFixed(2)), sampleRate: sr, audio: served.url, importedPath, wave: wavePeaks(samples, 260), ...extra } };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }
  async acidGen(req: any): Promise<any> { return this.synthImport(synthAcid, "acid", req, { note: req.params?.note ?? 36, bars: req.params?.bars ?? 1 }); }
  async subBassGen(req: any): Promise<any> { return this.synthImport(synthSubBass, "subbass", req, { note: req.params?.note ?? 28 }); }
  async organGen(req: any): Promise<any> { return this.synthImport(synthOrgan, "organ", req, { note: req.params?.note ?? 48, chord: req.params?.chord || "maj" }); }
  async vocalChopGen(req: any): Promise<any> { return this.synthImport(synthVocalChop, "vchop", req, { note: req.params?.note ?? 60, vowel: req.params?.vowel || "a", bars: req.params?.bars ?? 1 }); }
  async brassGen(req: any): Promise<any> { return this.synthImport(synthBrass, "brass", req, { note: req.params?.note ?? 55, chord: req.params?.chord || "single" }); }
  async wobbleGen(req: any): Promise<any> { return this.synthImport(synthWobble, "wobble", req, { note: req.params?.note ?? 36, bars: req.params?.bars ?? 1 }); }
  async choirGen(req: any): Promise<any> { return this.synthImport(synthChoir, "choir", req, { note: req.params?.note ?? 60, chord: req.params?.chord || "maj", vowel: req.params?.vowel || "a" }); }
  async subDropGen(req: any): Promise<any> { return this.synthImport(synthSubDrop, "drop", req, { startNote: req.params?.startNote ?? 48, endNote: req.params?.endNote ?? 24 }); }
  async pluckBassGen(req: any): Promise<any> { return this.synthImport(synthPluckBass, "pbass", req, { note: req.params?.note ?? 36 }); }
  async sawLeadGen(req: any): Promise<any> { return this.synthImport(synthSawLead, "lead", req, { note: req.params?.note ?? 60 }); }
  async reeseGen(req: any): Promise<any> { return this.synthImport(synthReese, "reese", req, { note: req.params?.note ?? 36 }); }
  async marimbaGen(req: any): Promise<any> { return this.synthImport(synthMarimba, "marimba", req, { note: req.params?.note ?? 60 }); }
  async glitchGen(req: any): Promise<any> { return this.synthImport(synthGlitch, "glitch", req, { bars: req.params?.bars ?? 1, seed: req.params?.seed ?? 1 }); }
  async tapeHissGen(req: any): Promise<any> { return this.synthImport(synthTapeHiss, "tape", req, { length: req.params?.length ?? 4 }); }
  async trumpetGen(req: any): Promise<any> { return this.synthImport(synthTrumpet, "trumpet", req, { note: req.params?.note ?? 65 }); }
  async ePianoGen(req: any): Promise<any> { return this.synthImport(synthEPiano, "epiano", req, { note: req.params?.note ?? 60 }); }
  async musicBoxGen(req: any): Promise<any> { return this.synthImport(synthMusicBox, "mbox", req, { note: req.params?.note ?? 72 }); }
  async harpGen(req: any): Promise<any> { return this.synthImport(synthHarp, "harp", req, { note: req.params?.note ?? 60, chord: req.params?.chord || "maj" }); }
  async whistleGen(req: any): Promise<any> { return this.synthImport(synthWhistle, "whistle", req, { note: req.params?.note ?? 72 }); }
  async subWobbleGen(req: any): Promise<any> { return this.synthImport(synthSubWobble, "swobble", req, { note: req.params?.note ?? 28, bars: req.params?.bars ?? 1 }); }
  async vocoderGen(req: any): Promise<any> { return this.synthImport(synthVocoder, "vocoder", req, { note: req.params?.note ?? 60, bars: req.params?.bars ?? 1 }); }
  async noiseFxGen(req: any): Promise<any> { return this.synthImport(synthNoiseFX, "nfx", req, { type: req.params?.type || "sweep_up" }); }
  async cymbalGen(req: any): Promise<any> { return this.synthImport(synthCymbal, "cymbal", req, { type: req.params?.type || "crash" }); }
  async guitarGen(req: any): Promise<any> { return this.synthImport(synthGuitar, "guitar", req, { note: req.params?.note ?? 40, chord: req.params?.chord || "power" }); }
  async sitarGen(req: any): Promise<any> { return this.synthImport(synthSitar, "sitar", req, { note: req.params?.note ?? 60 }); }
  async steelDrumGen(req: any): Promise<any> { return this.synthImport(synthSteelDrum, "steel", req, { note: req.params?.note ?? 64 }); }
  async accordionGen(req: any): Promise<any> { return this.synthImport(synthAccordion, "accordion", req, { note: req.params?.note ?? 60, chord: req.params?.chord || "single" }); }
  async thereminGen(req: any): Promise<any> { return this.synthImport(synthTheremin, "theremin", req, { note: req.params?.note ?? 72 }); }
  async hiHat808Gen(req: any): Promise<any> { return this.synthImport(synthHiHat808, "hat808", req, { open: !!req.params?.open }); }
  async stabHitGen(req: any): Promise<any> { return this.synthImport(synthStabHit, "stab808", req, { note: req.params?.note ?? 60, chord: req.params?.chord || "maj" }); }
  async glassBellGen(req: any): Promise<any> { return this.synthImport(synthGlassBell, "gbell", req, { note: req.params?.note ?? 72 }); }
  async subKickGen(req: any): Promise<any> { return this.synthImport(synthSubKick, "skick", req, { note: req.params?.note ?? 24 }); }
  async reverseSweepGen(req: any): Promise<any> { return this.synthImport(synthReverseSweep, "revsweep", req, {}); }

  // Instrument Render: render any MIDI clip through any in-host engine into a new audio clip.
  // engine = "sub808" | "subbass" | "pad" | "pluck" | "bell" | "stab" | "organ" | "vocalchop" | "drumsynth"
  async renderClip(req: { trackIndex?: number; clipIndex?: number; engine?: string; params?: any; import?: boolean; demo?: boolean }): Promise<any> {
    try {
      const sr = 44100, engine = req.engine || "pluck";
      let notes: RenderNote[] = [], srcName = "Demo";
      if (req.demo) { notes = [60, 64, 67, 72, 67, 64].map((p, i) => ({ pitch: p, startBeat: i * 0.5, durBeats: 0.45, velocity: 100 })); srcName = "Demo melody"; }
      else { const t = (this.song?.tracks || [])[req.trackIndex as number]; if (!t) return { success: false, error: "Track not found" }; const clip = t.clipSlots?.[req.clipIndex ?? 0]?.clip ?? t.arrangementClips?.[req.clipIndex ?? 0]; notes = clipToNotes(clip); srcName = clip?.name || t.name || "Clip"; if (!notes.length) return { success: false, error: "No MIDI notes in that clip." }; }
      const tempo = this.song?.tempo || 120;
      const ENG = {
        sub808: (n: RenderNote, s: number) => synth808({ ...req.params, note: n.pitch, length: Math.max(0.3, n.durBeats * 60 / tempo + 0.4) }, s),
        subbass: (n: RenderNote, s: number) => synthSubBass({ ...req.params, note: n.pitch, length: Math.max(0.2, n.durBeats * 60 / tempo) }, s),
        pad: (n: RenderNote, s: number) => synthPad({ ...req.params, note: n.pitch, chord: "single", length: Math.max(0.5, n.durBeats * 60 / tempo) }, s),
        pluck: (n: RenderNote, s: number) => synthPluck({ ...req.params, note: n.pitch, chord: "single", length: Math.max(0.4, n.durBeats * 60 / tempo + 0.6) }, s),
        bell: (n: RenderNote, s: number) => synthBell({ ...req.params, note: n.pitch, length: Math.max(0.4, n.durBeats * 60 / tempo + 0.8) }, s),
        stab: (n: RenderNote, s: number) => synthStab({ ...req.params, note: n.pitch, chord: "single", length: Math.max(0.15, n.durBeats * 60 / tempo) }, s),
        organ: (n: RenderNote, s: number) => synthOrgan({ ...req.params, note: n.pitch, chord: "single", length: Math.max(0.3, n.durBeats * 60 / tempo) }, s),
        vocalchop: (n: RenderNote, s: number) => synthVocalChop({ ...req.params, note: n.pitch, bars: 1 }, s).subarray(0, Math.floor(s * Math.max(0.3, n.durBeats * 60 / tempo))),
        drumsynth: (n: RenderNote, s: number) => synthDrum(req.params?.type || (n.pitch <= 38 ? "kick" : n.pitch <= 42 ? "snare" : "hat"), { ...req.params }, s),
        brass: (n: RenderNote, s: number) => synthBrass({ ...req.params, note: n.pitch, chord: "single", length: Math.max(0.3, n.durBeats * 60 / tempo + 0.3) }, s),
        choir: (n: RenderNote, s: number) => synthChoir({ ...req.params, note: n.pitch, chord: "single", length: Math.max(0.5, n.durBeats * 60 / tempo + 0.6) }, s),
        pluckbass: (n: RenderNote, s: number) => synthPluckBass({ ...req.params, note: n.pitch, length: Math.max(0.2, n.durBeats * 60 / tempo + 0.3) }, s),
        sawlead: (n: RenderNote, s: number) => synthSawLead({ ...req.params, note: n.pitch, length: Math.max(0.15, n.durBeats * 60 / tempo + 0.2) }, s),
        reese: (n: RenderNote, s: number) => synthReese({ ...req.params, note: n.pitch, length: Math.max(0.2, n.durBeats * 60 / tempo) }, s),
        marimba: (n: RenderNote, s: number) => synthMarimba({ ...req.params, note: n.pitch, length: Math.max(0.3, n.durBeats * 60 / tempo + 0.5) }, s),
        trumpet: (n: RenderNote, s: number) => synthTrumpet({ ...req.params, note: n.pitch, length: Math.max(0.2, n.durBeats * 60 / tempo + 0.2) }, s),
        epiano: (n: RenderNote, s: number) => synthEPiano({ ...req.params, note: n.pitch, length: Math.max(0.4, n.durBeats * 60 / tempo + 0.8) }, s),
        musicbox: (n: RenderNote, s: number) => synthMusicBox({ ...req.params, note: n.pitch, length: Math.max(0.3, n.durBeats * 60 / tempo + 0.8) }, s),
        harp: (n: RenderNote, s: number) => synthHarp({ ...req.params, note: n.pitch, chord: "single", length: Math.max(0.5, n.durBeats * 60 / tempo + 1) }, s),
        whistle: (n: RenderNote, s: number) => synthWhistle({ ...req.params, note: n.pitch, length: Math.max(0.3, n.durBeats * 60 / tempo + 0.3) }, s),
        guitar: (n: RenderNote, s: number) => synthGuitar({ ...req.params, note: n.pitch, chord: "single", length: Math.max(0.2, n.durBeats * 60 / tempo + 0.3) }, s),
        sitar: (n: RenderNote, s: number) => synthSitar({ ...req.params, note: n.pitch, length: Math.max(0.3, n.durBeats * 60 / tempo + 0.5) }, s),
        steeldrum: (n: RenderNote, s: number) => synthSteelDrum({ ...req.params, note: n.pitch, length: Math.max(0.3, n.durBeats * 60 / tempo + 0.5) }, s),
        accordion: (n: RenderNote, s: number) => synthAccordion({ ...req.params, note: n.pitch, chord: "single", length: Math.max(0.3, n.durBeats * 60 / tempo + 0.3) }, s),
        theremin: (n: RenderNote, s: number) => synthTheremin({ ...req.params, note: n.pitch, endNote: n.pitch, length: Math.max(0.3, n.durBeats * 60 / tempo + 0.3) }, s),
        glassbell: (n: RenderNote, s: number) => synthGlassBell({ ...req.params, note: n.pitch, length: Math.max(0.3, n.durBeats * 60 / tempo + 0.8) }, s),
      } as any;
      const fn = ENG[engine]; if (!fn) return { success: false, error: `Unknown engine: ${engine}` };
      const samples = renderMidi(notes, tempo, fn, sr);
      if (!samples.length) return { success: false, error: "Render produced no audio." };
      const served = this.writeServed(samples, sr, "render");
      let importedPath: string | null = null;
      if (req.import !== false && !req.demo && this.resources?.importIntoProject) { try { importedPath = await this.resources.importIntoProject(served.file); } catch { importedPath = null; } }
      return { success: true, data: { source: req.demo ? "demo" : "clip", srcName, engine, tempo, noteCount: notes.length, durSec: Number((samples.length / sr).toFixed(2)), audio: served.url, importedPath, wave: wavePeaks(samples, 280) } };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }
  async stabGen(req: any): Promise<any> { return this.synthImport(synthStab, "stab", req, { note: req.params?.note ?? 48, chord: req.params?.chord || "min7" }); }
  async bellGen(req: any): Promise<any> { return this.synthImport(synthBell, "bell", req, { note: req.params?.note ?? 60 }); }
  async impactGen(req: any): Promise<any> { return this.synthImport(synthImpact, "impact", req, { note: req.params?.note ?? 28 }); }

  // Pad: synthesize an evolving pad/chord from params, serve it for audition and import.
  async padGen(req: { params?: any; import?: boolean; demo?: boolean }): Promise<any> {
    try {
      const sr = 44100;
      const samples = synthPad(req.params || {}, sr);
      const served = this.writeServed(samples, sr, "pad");
      let importedPath: string | null = null;
      if (req.import !== false && !req.demo && this.resources?.importIntoProject) { try { importedPath = await this.resources.importIntoProject(served.file); } catch { importedPath = null; } }
      return { success: true, data: { note: req.params?.note ?? 48, chord: req.params?.chord || "min7", durSec: Number((samples.length / sr).toFixed(2)), sampleRate: sr, audio: served.url, importedPath, wave: wavePeaks(samples, 260) } };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }

  // Pluck: synthesize a Karplus-Strong plucked string/chord, serve it for audition and import.
  async pluckGen(req: { params?: any; import?: boolean; demo?: boolean }): Promise<any> {
    try {
      const sr = 44100;
      const samples = synthPluck(req.params || {}, sr);
      const served = this.writeServed(samples, sr, "pluck");
      let importedPath: string | null = null;
      if (req.import !== false && !req.demo && this.resources?.importIntoProject) { try { importedPath = await this.resources.importIntoProject(served.file); } catch { importedPath = null; } }
      return { success: true, data: { note: req.params?.note ?? 48, chord: req.params?.chord || "min7", durSec: Number((samples.length / sr).toFixed(2)), sampleRate: sr, audio: served.url, importedPath, wave: wavePeaks(samples, 260) } };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }

  // Riser: synthesize a sweep/riser from params, serve it for audition and import as a new clip.
  async riserGen(req: { params?: any; import?: boolean; demo?: boolean }): Promise<any> {
    try {
      const sr = 44100;
      const samples = synthRiser(req.params || {}, sr);
      const served = this.writeServed(samples, sr, "riser");
      let importedPath: string | null = null;
      if (req.import !== false && !req.demo && this.resources?.importIntoProject) { try { importedPath = await this.resources.importIntoProject(served.file); } catch { importedPath = null; } }
      return { success: true, data: { durSec: Number((samples.length / sr).toFixed(2)), sampleRate: sr, audio: served.url, importedPath, wave: wavePeaks(samples, 260) } };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }

  // Time-stretch: read a clip's source audio (filePath, else render), OLA or varispeed stretch it
  // by `ratio`, encode a new WAV to tempDirectory and import it as a new clip (non-destructive).
  async timeStretch(req: { trackIndex?: number; clipIndex?: number; ratio?: number; mode?: string; grain?: number; import?: boolean; demo?: boolean }): Promise<any> {
    try {
      const ratio = Math.max(0.25, Math.min(4, req.ratio || 1.5));
      const grain = Math.max(64, Math.min(4096, req.grain || 1024));
      const mode = req.mode === "varispeed" ? "varispeed" : "ola";
      let samples: Float32Array, sampleRate: number, srcName = "Demo";
      if (req.demo) {
        sampleRate = 44100;
        samples = new Float32Array(Math.floor(sampleRate * 1.2));
        for (let i = 0; i < samples.length; i++) { const t = i / sampleRate; const f = 220 + 180 * (i / samples.length); samples[i] = 0.6 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 0.6); }
        srcName = "Demo sweep";
      } else {
        const t = (this.song?.tracks || [])[req.trackIndex as number];
        if (!t) return { success: false, error: `Track ${req.trackIndex} not found` };
        const clip = t.clipSlots?.[req.clipIndex ?? 0]?.clip ?? t.arrangementClips?.[req.clipIndex ?? 0];
        if (clip && typeof clip.filePath === "string" && clip.filePath && existsSync(clip.filePath)) {
          const dec = decodeWav(readFileSync(clip.filePath)); samples = dec.samples; sampleRate = dec.sampleRate; srcName = clip.name || basename(clip.filePath);
        } else if (this.resources?.renderPreFxAudio && "createAudioClip" in t) {
          const start = clip?.startTime ?? 0; const end = start + (clip?.duration ?? 4);
          const dec = decodeWav(readFileSync(await this.resources.renderPreFxAudio(t, start, end))); samples = dec.samples; sampleRate = dec.sampleRate; srcName = t.name;
        } else { return { success: false, error: "Select an audio clip (needs a sample file or a renderable audio track)." }; }
      }
      const inSamples = samples.length;
      const out = mode === "varispeed" ? varispeed(samples, ratio) : olaStretch(samples, ratio, grain);
      const base = this.environment?.tempDirectory || join(tmpdir(), "live-studio");
      const dir = join(base, "stretch"); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const file = join(dir, `stretch_${mode}_${Date.now()}.wav`);
      writeFileSync(file, encodeWav16(out, sampleRate));
      let importedPath: string | null = null;
      if (req.import !== false && !req.demo && this.resources?.importIntoProject) { try { importedPath = await this.resources.importIntoProject(file); } catch { importedPath = null; } }
      return { success: true, data: { source: req.demo ? "demo" : "clip", srcName, mode, ratio: Number(ratio.toFixed(3)), grain, sampleRate, inSamples, outSamples: out.length, inSec: Number((inSamples / sampleRate).toFixed(2)), outSec: Number((out.length / sampleRate).toFixed(2)), file, importedPath, waveIn: wavePeaks(samples, 200), waveOut: wavePeaks(out, 200) } };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  // Groove from audio: render a source audio loop, detect onsets, derive a per-step micro-timing
  // template (deviation from the grid) and optionally apply it to a target MIDI clip's notes.
  async grooveFromAudio(req: { sourceTrack?: number; startBeat?: number; endBeat?: number; grid?: number; targetTrack?: number; targetClip?: number; strength?: number; sensitivity?: number; demo?: boolean }): Promise<any> {
    try {
      const startBeat = req.startBeat ?? 0, endBeat = req.endBeat ?? 4;
      const tempo = this.song?.tempo || 120;
      const secPerBeat = 60 / tempo;
      const grid = req.grid ?? 0.25;
      let samples: Float32Array, sampleRate: number, srcName = "Demo";
      if (req.demo) {
        sampleRate = 44100;
        const dur = 4 * secPerBeat; samples = new Float32Array(Math.floor(sampleRate * dur));
        for (let b = 0; b < 8; b++) { const beat = b * 0.5, sw = b % 2 === 1 ? 0.08 : 0; const t = (beat + sw) * secPerBeat; const i0 = Math.floor(t * sampleRate); for (let k = 0; k < 1500; k++) { const i = i0 + k; if (i < samples.length) samples[i] += Math.exp(-k / 300) * Math.sin((2 * Math.PI * 4000 * k) / sampleRate) * 0.8; } }
        srcName = "Demo loop";
      } else {
        const t = (this.song?.tracks || [])[req.sourceTrack as number];
        if (!t) return { success: false, error: `Track ${req.sourceTrack} not found` };
        if (!("createAudioClip" in t)) return { success: false, error: "Groove-from-audio reads an audio track." };
        if (!this.resources?.renderPreFxAudio) return { success: false, error: "Audio render is only available inside Live." };
        const wav: string = await this.resources.renderPreFxAudio(t, startBeat, endBeat);
        const dec = decodeWav(readFileSync(wav)); samples = dec.samples; sampleRate = dec.sampleRate; srcName = t.name;
      }
      const onsets = detectOnsets(samples, sampleRate, req.sensitivity ?? 0.18);
      const period = 16;
      const sumOff = new Array(period).fill(0), count = new Array(period).fill(0);
      for (const o of onsets) { const beat = startBeat + o.timeSec / secPerBeat; const gridIdx = Math.round(beat / grid); const step = ((gridIdx % period) + period) % period; sumOff[step] += beat - gridIdx * grid; count[step]++; }
      const steps = Array.from({ length: period }, (_, s) => ({ step: s, avgOffset: count[s] ? sumOff[s] / count[s] : 0, count: count[s] }));
      const off = steps.filter((s) => s.count > 0 && s.step % 4 !== 0);
      const swingMs = off.length ? Math.round((off.reduce((a, s) => a + s.avgOffset, 0) / off.length) * secPerBeat * 1000) : 0;
      let applied: any = null;
      if (req.targetTrack != null) {
        const tt = (this.song?.tracks || [])[req.targetTrack];
        const tgt = tt?.clipSlots?.[req.targetClip ?? 0]?.clip ?? tt?.arrangementClips?.[req.targetClip ?? 0];
        if (tgt && Array.isArray(tgt.notes) && tgt.notes.length) {
          const strength = Math.max(0, Math.min(1, (req.strength ?? 100) / 100));
          recordNotes(tgt, req.targetTrack, req.targetClip ?? 0, "groovetemplate.extract_from_audio");
          let moved = 0;
          tgt.notes = tgt.notes.map((n: any) => { const gi = Math.round(n.startTime / grid), st = ((gi % period) + period) % period, o = steps[st]?.avgOffset ?? 0, ns = Math.max(0, gi * grid + o * strength); if (Math.abs(ns - n.startTime) > 1e-6) moved++; return { ...n, startTime: ns }; });
          applied = { targetClip: tgt.name, notesMoved: moved, notesTotal: tgt.notes.length, strength: Math.round(strength * 100) };
        }
      }
      return { success: true, data: { source: req.demo ? "demo" : "render", srcName, onsets: onsets.length, swingMs, grid, steps: steps.map((s) => ({ ...s, offsetMs: Number((s.avgOffset * secPerBeat * 1000).toFixed(1)) })), applied } };
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

  // Macro Snapshot Morph: capture a device's parameter values to disk, then interpolate
  // (lerp) between two snapshots and write the result back via DeviceParameter.setValue.
  // Live has no preset morphing — this slides between two states you liked.
  private macroDir(key: string): string {
    const base = this.environment?.storageDirectory || join(tmpdir(), "live-studio");
    const dir = join(base, ".macro-snapshots", key); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }
  private loadMacro(dir: string, id: string): any { try { const p = join(dir, id + ".json"); return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null; } catch { return null; } }

  async macroMorph(req: any): Promise<any> {
    try {
      const tracks = this.song?.tracks || [];
      const device = tracks[req.trackIndex]?.devices?.[req.deviceIndex];
      const readParams = async (d: any) => Promise.all((d.parameters || []).map(async (p: any) => ({ name: p.name, value: await p.getValue(), min: p.min, max: p.max, quantized: p.isQuantized })));
      if (req.action === "read") {
        if (!device) return { success: false, error: "Device not found" };
        const params = await readParams(device);
        return { success: true, data: { deviceName: device.name, paramCount: params.length, params } };
      }
      const dir = this.macroDir(`t${req.trackIndex}_d${req.deviceIndex}`);
      if (req.action === "capture") {
        if (!device) return { success: false, error: "Device not found" };
        const params = await readParams(device);
        const id = `${Date.now()}_${(req.label || "snap").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 20)}`;
        writeFileSync(join(dir, id + ".json"), JSON.stringify({ id, label: req.label || "snapshot", timestamp: new Date().toISOString(), deviceName: device.name, params }));
        return { success: true, data: { id, paramCount: params.length } };
      }
      if (req.action === "list") {
        const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
        const snapshots = files.map((f) => { try { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); return { id: s.id, label: s.label, timestamp: s.timestamp, paramCount: s.params.length }; } catch { return null; } }).filter(Boolean).sort((a: any, b: any) => (a.timestamp < b.timestamp ? 1 : -1));
        return { success: true, data: { snapshots } };
      }
      if (req.action === "get") { const s = this.loadMacro(dir, req.id); return s ? { success: true, data: s } : { success: false, error: "Snapshot not found" }; }
      if (req.action === "morph" || req.action === "apply") {
        if (!device) return { success: false, error: "Device not found" };
        const a = this.loadMacro(dir, req.idA); const b = req.action === "apply" ? a : this.loadMacro(dir, req.idB);
        if (!a || !b) return { success: false, error: "Snapshot not found" };
        const t = req.action === "apply" ? 1 : Math.max(0, Math.min(1, req.t ?? 0));
        const am = Object.fromEntries(a.params.map((p: any) => [p.name, p])), bm = Object.fromEntries(b.params.map((p: any) => [p.name, p]));
        let n = 0;
        for (const p of device.parameters || []) { const pa = am[p.name], pb = bm[p.name]; if (!pa || !pb) continue; let v = pa.value + (pb.value - pa.value) * t; if (p.isQuantized) v = Math.round(v); try { await p.setValue(v); n++; } catch { /* skip read-only */ } }
        return { success: true, data: { morphed: true, t, paramsSet: n } };
      }
      if (req.action === "delete") { const p = join(dir, req.id + ".json"); if (existsSync(p)) unlinkSync(p); return { success: true, data: { deleted: true } }; }
      return { success: false, error: `Unknown macro action: ${req.action}` };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }

  // Loop Length Detective: decode an audio clip (or render it) and estimate its tempo +
  // bar-fit BPM candidates, then optionally apply one as the global song.tempo.
  async loopDetect(req: any): Promise<any> {
    try {
      let samples: Float32Array, sampleRate: number, durationSec: number, clipName = "loop";
      if (req.demo) {
        const sr = 44100; durationSec = 4; samples = new Float32Array(sr * 4);
        for (const on of [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]) { const st = Math.floor(on * sr); for (let k = 0; k < Math.floor(0.06 * sr) && st + k < samples.length; k++) samples[st + k] = 0.8 * Math.sin((2 * Math.PI * 330 * k) / sr) * Math.exp(-k / (0.015 * sr)); }
        sampleRate = sr; clipName = "Demo loop (120 BPM)";
      } else {
        const t = this.song?.tracks?.[req.trackIndex]; if (!t) return { success: false, error: "Track not found" };
        const clip = t.clipSlots?.[req.clipIndex ?? 0]?.clip ?? t.arrangementClips?.[req.clipIndex ?? 0];
        if (!clip) return { success: false, error: "No clip at that slot." };
        if (typeof clip.filePath === "string" && /\.wav$/i.test(clip.filePath) && existsSync(clip.filePath)) {
          const dec = decodeWav(readFileSync(clip.filePath)); samples = dec.samples; sampleRate = dec.sampleRate; clipName = clip.name || basename(clip.filePath);
        } else {
          if (!this.resources?.renderPreFxAudio || !("createAudioClip" in t)) return { success: false, error: "Select a WAV audio clip (or open in Live to render)." };
          const start = clip.startTime ?? 0; const dec = decodeWav(readFileSync(await this.resources.renderPreFxAudio(t, start, start + (clip.duration ?? 4))));
          samples = dec.samples; sampleRate = dec.sampleRate; clipName = clip.name || "loop";
        }
        durationSec = samples.length / sampleRate;
      }
      durationSec = durationSec! ?? samples!.length / sampleRate!;
      const detectedBpm = estimateBpm(samples!, sampleRate!);
      const candidates = [1, 2, 4, 8, 16].map((bars) => ({ bars, bpm: Math.round(((bars * 4) / durationSec) * 60) })).filter((c) => c.bpm >= 70 && c.bpm <= 190);
      let applied = false;
      if (req.applyTempo != null && this.song && "tempo" in this.song) { try { this.song.tempo = req.applyTempo; applied = true; } catch { /* */ } }
      return { success: true, data: { clipName, durationSec: Number(durationSec.toFixed(2)), currentTempo: this.song?.tempo ?? null, detectedBpm, candidates, applied, appliedTempo: applied ? req.applyTempo : null } };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }

  // Warp Mode A/B Comparator: render the clip in each warp mode to WAVs the webview can play,
  // and apply the chosen mode (warpMode IS settable; warp markers are not).
  async warpCompare(req: any): Promise<any> {
    const MODES = [{ id: 0, name: "Beats" }, { id: 1, name: "Tones" }, { id: 2, name: "Texture" }, { id: 3, name: "Repitch" }, { id: 4, name: "Complex" }, { id: 6, name: "Complex Pro" }];
    try {
      if (req.applyMode != null && !req.demo) {
        const t = this.song?.tracks?.[req.trackIndex]; const clip = t?.clipSlots?.[req.clipIndex ?? 0]?.clip ?? t?.arrangementClips?.[req.clipIndex ?? 0];
        if (!clip) return { success: false, error: "Clip not found" };
        try { clip.warping = true; clip.warpMode = req.applyMode; } catch { return { success: false, error: "Could not set warp mode" }; }
        return { success: true, data: { applied: true, mode: req.applyMode } };
      }
      if (req.demo) return { success: true, data: { demo: true, modes: MODES.map((m) => ({ ...m, audio: null })), note: "Render runs in Live" } };
      const t = this.song?.tracks?.[req.trackIndex]; const clip = t?.clipSlots?.[req.clipIndex ?? 0]?.clip ?? t?.arrangementClips?.[req.clipIndex ?? 0];
      if (!t || !clip) return { success: false, error: "Clip not found" };
      if (!("createAudioClip" in t)) return { success: false, error: "Audio clip required." };
      if (!this.resources?.renderPreFxAudio) return { success: false, error: "Render is only available inside Live." };
      const base = this.environment?.tempDirectory || join(tmpdir(), "live-studio"); const dir = join(base, "warp"); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const start = clip.startTime ?? 0, end = start + (clip.duration ?? 4), original = clip.warpMode;
      const out: any[] = [];
      for (const m of MODES) { try { clip.warping = true; clip.warpMode = m.id; const wav = await this.resources.renderPreFxAudio(t, start, end); copyFileSync(wav, join(dir, `mode_${m.id}.wav`)); out.push({ ...m, audio: `/api/warpaudio?id=mode_${m.id}` }); } catch { out.push({ ...m, audio: null }); } }
      try { clip.warpMode = original; } catch { /* */ }
      return { success: true, data: { clipName: clip.name, modes: out } };
    } catch (err: any) { return { success: false, error: err?.message || String(err) }; }
  }
  warpAudio(id: string): Buffer | null {
    try { const base = this.environment?.tempDirectory || join(tmpdir(), "live-studio"); const safe = String(id).replace(/[^a-z0-9_]/gi, ""); const p = join(base, "warp", safe + ".wav"); return existsSync(p) ? readFileSync(p) : null; } catch { return null; }
  }

  // Safe Randomizer: perturb a device's parameters within a bounded fraction of their range
  // (nudge, don't break the sound), skipping locked params. Locks + the pre-randomize state
  // persist to storageDirectory so you can lock keepers and Reset.
  private lockPath(key: string): string {
    const base = this.environment?.storageDirectory || join(tmpdir(), "live-studio");
    const dir = join(base, ".param-locks"); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return join(dir, key + ".json");
  }
  private loadLocks(key: string): any { try { const p = this.lockPath(key); return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : { locked: [], last: null }; } catch { return { locked: [], last: null }; } }

  async safeRandomize(req: any): Promise<any> {
    try {
      // instrument-aware layer: keep global params musical (smart guard), target a section
      // (category), and map an intensity preset to an amount.
      const SR_INTENSITY: Record<string, number> = { subtle: 10, balanced: 25, wild: 50 };
      const SR_CATS: Record<string, string[]> = {
        osc: ["osc", "wave", "shape", "unison", "detune", "spread", "sub", "fm", "ratio", "partial", "tune", "mallet", "noise"],
        filter: ["filter", "cutoff", "freq", "reso", "slope", "morph"],
        env: ["env", "attack", "decay", "sustain", "release", "hold"],
        lfo: ["lfo", "rate", "mod", "depth"],
        fx: ["reverb", "delay", "chorus", "dist", "drive", "crush", "width", "mix", "dry", "wet"],
        pitch: ["pitch", "tune", "detune", "octave", "semi", "transpose", "glide"],
      };
      const SR_GUARD = ["volume", "vol", "gain", "master", "pan", "mute", "monophon", "poly", "voice"];
      const lc = (s: any) => String(s).toLowerCase();
      const cat: string[] | null = req.category && SR_CATS[req.category] ? SR_CATS[req.category] : null;
      const smart = req.smart !== false; // instrument-aware guard on by default
      const amt = Math.max(0, Math.min(1, (req.amount != null ? req.amount : (SR_INTENSITY[req.intensity] ?? 20)) / 100));
      const device = this.song?.tracks?.[req.trackIndex]?.devices?.[req.deviceIndex];
      const key = `t${req.trackIndex}_d${req.deviceIndex}`;
      if (req.demo) {
        const base = ["Cutoff", "Reso", "Attack", "Decay", "Drive", "Mix", "Detune", "Width"].map((n, i) => ({ name: n, value: 30 + i * 8, min: 0, max: 127, quantized: false, locked: i === 3 }));
        let params = base;
        if (req.action === "randomize") { params = base.map((p) => { if (p.locked) return p; if (cat && !cat.some((k) => lc(p.name).includes(k))) return p; return { ...p, value: Math.max(p.min, Math.min(p.max, Math.round(p.value + (Math.random() * 2 - 1) * amt * (p.max - p.min)))) }; }); }
        return { success: true, data: { deviceName: "Demo Synth", params, demo: true, category: req.category || "all", amount: Math.round(amt * 100) } };
      }
      if (req.action === "lock" || req.action === "unlock") {
        const st = this.loadLocks(key); const set = new Set(st.locked);
        if (req.action === "lock") set.add(req.paramName); else set.delete(req.paramName);
        st.locked = [...set]; writeFileSync(this.lockPath(key), JSON.stringify(st));
        return { success: true, data: { locked: st.locked } };
      }
      if (!device) return { success: false, error: "Device not found" };
      const st = this.loadLocks(key); const lockedSet = new Set(st.locked);
      const read = async () => Promise.all((device.parameters || []).map(async (p: any) => ({ name: p.name, value: await p.getValue(), min: p.min, max: p.max, quantized: p.isQuantized, locked: lockedSet.has(p.name) })));
      if (req.action == null || req.action === "read") return { success: true, data: { deviceName: device.name, params: await read() } };
      if (req.action === "randomize") {
        const before = await read();
        st.last = before.map((p) => ({ name: p.name, value: p.value })); writeFileSync(this.lockPath(key), JSON.stringify(st));
        let n = 0, skipped = 0;
        for (const p of device.parameters || []) {
          if (lockedSet.has(p.name)) { skipped++; continue; }
          if (smart && SR_GUARD.some((g) => lc(p.name).includes(g))) { skipped++; continue; }
          if (cat && !cat.some((k) => lc(p.name).includes(k))) { skipped++; continue; }
          const cur = await p.getValue(); let v = cur + (Math.random() * 2 - 1) * amt * (p.max - p.min); v = Math.max(p.min, Math.min(p.max, v)); if (p.isQuantized) v = Math.round(v); await p.setValue(v); n++;
        }
        return { success: true, data: { randomized: true, paramsChanged: n, skipped, amount: Math.round(amt * 100), category: req.category || "all", smart, instrument: device.name } };
      }
      if (req.action === "reset") {
        if (!st.last) return { success: false, error: "Nothing to reset yet." };
        const bm: Record<string, number> = Object.fromEntries(st.last.map((p: any) => [p.name, p.value]));
        let n = 0; for (const p of device.parameters || []) { if (p.name in bm) { await p.setValue(bm[p.name]); n++; } }
        return { success: true, data: { reset: true, paramsRestored: n } };
      }
      return { success: false, error: `Unknown action: ${req.action}` };
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
