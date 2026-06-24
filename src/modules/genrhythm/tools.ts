// Módulo: Generative Rhythm Generator — rule-based probabilistic patterns that write notes
// with the SDK's NATIVE `probability` and `velocityDeviation` fields, so Live itself plays
// them non-deterministically (every loop differs). Optional "evolve" mutates density per bar.
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

const LANES = [
  { name: "Kick", pitch: 36 },
  { name: "Snare", pitch: 38 },
  { name: "Hat", pitch: 42 },
];

// Returns per-lane step probabilities for one 16-step bar given a density and a mutation seed.
function barRules(density: number, mutate: number) {
  const d = Math.max(0, Math.min(1, density / 100));
  const lanes = LANES.map((l) => ({ name: l.name, pitch: l.pitch, steps: new Array(16).fill(0) as number[] }));
  for (let s = 0; s < 16; s++) {
    // Kick: downbeats certain, off-beats by density
    if (s % 8 === 0) lanes[0].steps[s] = 1;
    else if (s % 4 === 0 && Math.random() < 0.4 + d * 0.4) lanes[0].steps[s] = 0.6 + d * 0.3;
    else if (Math.random() < d * 0.18 + mutate * 0.1) lanes[0].steps[s] = 0.35;
    // Snare: backbeat certain, ghosts by density
    if (s === 4 || s === 12) lanes[1].steps[s] = 1;
    else if (Math.random() < d * 0.2) lanes[1].steps[s] = 0.4 + Math.random() * 0.3;
    // Hat: density-driven, accents on 8ths
    if (Math.random() < 0.35 + d * 0.6) lanes[2].steps[s] = s % 2 === 0 ? 0.8 + d * 0.2 : 0.45 + d * 0.3;
  }
  return lanes;
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"generate", description:"Generate a generative drum pattern using native note probability + velocity deviation", category:"generative", parameters:{ bars:{type:"number",description:"Number of bars (default 2)",required:false}, density:{type:"number",description:"Overall density 0-100 (default 55)",required:false}, evolve:{type:"boolean",description:"Mutate density bar-by-bar",required:false}, humanize:{type:"number",description:"Velocity deviation 0-40 (default 14)",required:false}, track_index:{type:"number",description:"Existing track (omit = new)",required:false} } },
    async (args: any, song: any) => {
      const bars = Math.max(1, Math.min(8, args.bars || 2));
      const baseDensity = args.density ?? 55;
      const vDev = args.humanize ?? 14;
      const g = 0.25; // 1/16 step in beats
      const trackIdx = args.track_index;
      const track = trackIdx != null ? song.tracks[trackIdx] : await song.createMidiTrack();
      if (trackIdx == null) track.name = `Generative ${baseDensity}%`;
      const clip = await track.createMidiClip(0, bars * 4);
      clip.name = `Generative ${bars}b`;
      const notes: any[] = [];
      const lanesOut: any[] = LANES.map((l) => ({ name: l.name, pitch: l.pitch, steps: [] as any[] }));
      for (let b = 0; b < bars; b++) {
        const density = args.evolve ? Math.max(10, Math.min(95, baseDensity + (b - bars / 2) * 12 + (Math.random() - 0.5) * 14)) : baseDensity;
        const lanes = barRules(density, args.evolve ? b / bars : 0);
        lanes.forEach((lane, li) => {
          for (let s = 0; s < 16; s++) {
            const p = lane.steps[s];
            lanesOut[li].steps.push({ on: p > 0, prob: Number(p.toFixed(2)) });
            if (p > 0) {
              const vel = lane.name === "Hat" ? 70 + p * 30 : 95 + p * 25;
              notes.push({ pitch: lane.pitch, startTime: (b * 16 + s) * g, duration: g * 0.9, velocity: Math.min(127, Math.round(vel)), probability: Math.max(0.05, Math.min(1, p)), velocityDeviation: vDev });
            }
          }
        });
      }
      clip.notes = notes;
      return { success:true, data:{ bars, density: baseDensity, evolve: !!args.evolve, trackIndex: song.tracks.indexOf(track), clipName: clip.name, noteCount: notes.length, lanes: lanesOut } };
    }
  );

  reg.register({ name:"how_it_works", description:"Explain how the generative rhythm uses native note probability", category:"generative", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Each step gets a probability (0-1) written to the MIDI note's native `probability` field, so Live re-rolls it on every loop.",
      "Velocity carries a `velocityDeviation` so dynamics vary too — patterns breathe instead of repeating exactly.",
      "Density controls how busy the off-beats and hats are; Evolve drifts the density across bars for a build/drop feel.",
    ] } })
  );

  return reg;
}
