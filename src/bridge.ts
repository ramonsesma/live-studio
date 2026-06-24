import { MasterRegistry } from "./core/registry.js";
import type { LLMClient, LLMMessage } from "./core/llm.js";
import { analyzeWavFile, analyzePcm, synthPcm, faderDbToValue, peakFrequencies, decodeWav, type Analysis } from "./core/dsp.js";
import { readFileSync } from "node:fs";

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
