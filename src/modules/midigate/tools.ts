// Módulo: MIDI Gate — gate patterns written as REAL MIDI clips.
// Rewritten from the examples/midi-gate stub: the old generate_gate_pattern returned a
// Math.random() noteCount without writing a single note, set_gate_pattern created an empty
// junk track, and gate_to_audio created an empty audio track claiming rendered:true. Now
// both pattern tools write actual notes (deterministic — no RNG) and record to Edit History;
// gate_to_audio was removed (audio gating needs the in-Live render pipeline — use the
// pattern clip to sidechain a Gate device instead).
import { recordNotes } from "../../core/history.js";

export class ToolRegistry {
  private handlers = new Map();
  definitions: any[] = [];
  register(def: any, handler: any) { this.definitions.push(def); this.handlers.set(def.name, handler); }
  async execute(name: string, args: any, song: any) {
    const h = this.handlers.get(name);
    if (!h) return { success: false, error: `Unknown: ${name}` };
    try { return await h(args, song); }
    catch (err: any) { return { success: false, error: err.message || String(err) }; }
  }
  getDefinitionsJson() { return this.definitions; }
}

const GATE_PITCH = 60; // C3 — the note a sidechained Gate device listens to
const STEP_BEATS: Record<string, number> = { "1/4": 1, "1/8": 0.5, "1/16": 0.25, "1/32": 0.125, "1/64": 0.0625 };

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"set_midi_gate", description:"Configure MIDI gate effect on an audio track", category:"midi-gate", parameters:{ track_index:{type:"number",description:"Audio track index",required:true}, source_track:{type:"number",description:"MIDI track with gating pattern",required:true}, mode:{type:"string",description:"Gate mode",required:false,enum:["open","closed","trigger","toggle"]}, open_time:{type:"number",description:"Gate open time ms",required:false}, smooth:{type:"number",description:"Smoothing/attack ms",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      const src = song.tracks[args.source_track];
      return { success:true, data:{ advisory:true, note:"Routing a MIDI gate device isn't writable via the SDK — set the Gate's sidechain manually. (generate_gate_pattern writes a real pattern clip you can use.)", trackName:track?.name||"Unknown", sourceTrack:src?.name||"Unknown", mode:args.mode||"trigger", openTime:args.open_time||50, smoothing:args.smooth||5 } };
    }
  );

  reg.register({ name:"generate_gate_pattern", description:"Write a real MIDI gate-pattern clip (deterministic euclidean spread by density, with swing and accents) on a track — undoable", category:"midi-gate", parameters:{ track_index:{type:"number",description:"Track to write onto (omit to create a new MIDI track)",required:false}, grid:{type:"string",description:"Gate grid resolution",required:false,enum:["1/4","1/8","1/16","1/32","1/64"]}, length:{type:"number",description:"Pattern length in bars (default 1)",required:false}, density:{type:"number",description:"Gate density 0-100% (default 50)",required:false}, swing:{type:"number",description:"Swing amount 0-100%",required:false}, accent:{type:"number",description:"Accent strength 0-100% (downbeats hit harder)",required:false} } },
    async (args: any, song: any) => {
      const grid = STEP_BEATS[args.grid] ? args.grid : "1/16";
      const stepBeats = STEP_BEATS[grid];
      const bars = Math.max(1, Math.min(8, args.length || 1));
      const density = Math.max(0, Math.min(100, args.density ?? 50));
      const swing = Math.max(0, Math.min(100, args.swing || 0));
      const accent = Math.max(0, Math.min(100, args.accent || 0));
      const totalSteps = Math.round((bars * 4) / stepBeats);
      if (density === 0) return { success:false, error:"density 0 writes no gates — raise it above 0." };

      // Deterministic euclidean-style spread: step i turns ON when the density accumulator
      // crosses an integer boundary — the same density always yields the same pattern.
      const stepsPerBeat = Math.max(1, Math.round(1 / stepBeats));
      const notes: any[] = [];
      let acc = 0;
      for (let i = 0; i < totalSteps; i++) {
        acc += density / 100;
        if (acc >= 1) {
          acc -= 1;
          const isOffbeat = stepsPerBeat >= 2 && i % 2 === 1;
          const start = i * stepBeats + (isOffbeat ? (swing / 100) * stepBeats * 0.5 : 0);
          const isDownbeat = i % stepsPerBeat === 0;
          const velocity = Math.round(isDownbeat ? 90 + (accent / 100) * 37 : 90 - (accent / 100) * 25);
          notes.push({ pitch: GATE_PITCH, startTime: start, duration: stepBeats * 0.9, velocity: Math.max(1, Math.min(127, velocity)) });
        }
      }
      if (!notes.length) return { success:false, error:"That density produced no gates — raise it." };

      let track = args.track_index !== undefined ? song.tracks[args.track_index] : null;
      if (args.track_index !== undefined && !track) return { success:false, error:"Track not found" };
      let trackIndex = args.track_index;
      if (!track) {
        track = await song.createMidiTrack();
        track.name = "Gate Pattern";
        trackIndex = song.tracks.indexOf(track);
      }
      const clip = await track.createMidiClip(0, bars * 4);
      clip.name = `Gate ${grid} d${density}`;
      recordNotes(clip, trackIndex, 0, "midigate.generate_gate_pattern");
      clip.notes = notes;
      return { success:true, data:{ generated:true, trackIndex, clipName:clip.name, grid, bars, density, swing, accent, noteCount:notes.length, gatePitch:GATE_PITCH } };
    }
  );

  reg.register({ name:"set_gate_pattern", description:"Write a gate pattern from a binary string (1/x = on, 0/./- = off) as a REAL MIDI clip — undoable", category:"midi-gate", parameters:{ track_index:{type:"number",description:"Track to write onto (omit to create a new MIDI track)",required:false}, pattern:{type:"string",description:"Gate pattern (e.g. 1010100010101000)",required:true}, rate:{type:"string",description:"Step rate",required:false,enum:["1/4","1/8","1/16","1/32"]} } },
    async (args: any, song: any) => {
      const raw = String(args.pattern || "").trim();
      const stepsArr = raw.split("").filter((c: string) => "1x0.-".includes(c.toLowerCase())).map((c: string) => c === "1" || c.toLowerCase() === "x");
      if (!stepsArr.length) return { success:false, error:"Pattern must be a string of 1/0 (or x/.) steps." };
      if (!stepsArr.some(Boolean)) return { success:false, error:"Pattern has no ON steps." };
      const rate = STEP_BEATS[args.rate] ? args.rate : "1/16";
      const stepBeats = STEP_BEATS[rate];

      let track = args.track_index !== undefined ? song.tracks[args.track_index] : null;
      if (args.track_index !== undefined && !track) return { success:false, error:"Track not found" };
      let trackIndex = args.track_index;
      if (!track) {
        track = await song.createMidiTrack();
        track.name = "Gate Seq";
        trackIndex = song.tracks.indexOf(track);
      }
      const lengthBeats = Math.max(4, Math.ceil((stepsArr.length * stepBeats) / 4) * 4);
      const clip = await track.createMidiClip(0, lengthBeats);
      clip.name = `Gate ${rate} (${stepsArr.length} steps)`;
      recordNotes(clip, trackIndex, 0, "midigate.set_gate_pattern");
      const notes = stepsArr
        .map((on: boolean, i: number) => on ? { pitch: GATE_PITCH, startTime: i * stepBeats, duration: stepBeats * 0.9, velocity: i % 4 === 0 ? 110 : 92 } : null)
        .filter(Boolean);
      clip.notes = notes;
      return { success:true, data:{ patternSet:true, trackIndex, clipName:clip.name, steps:stepsArr.length, rate, resolvedSteps:notes.length, gatePitch:GATE_PITCH } };
    }
  );

  return reg;
}
