// SDK types relajados a any para reutilización directa

type V = "1.0.0";

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    enum?: string[];
  }>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// The Live Extensions API has no track.createReverb()/createEq()/etc.; built-in Live
// devices are inserted by name via track.insertDevice(name, index). And Device.parameters
// is an ARRAY of DeviceParameter (not a name-keyed object), so we match a parameter by
// name (case-insensitive substring) and set it best-effort — unknown params are skipped.
const LIVE_DEVICE: Record<string, string> = {
  eq: "EQ Eight", compress: "Compressor", gate: "Gate",
  reverb: "Reverb", delay: "Delay", limiter: "Limiter",
};

async function insertFx(track: any, kind: string, params: Record<string, number | undefined>): Promise<void> {
  const device = await track.insertDevice(LIVE_DEVICE[kind] || kind, track.devices?.length ?? 0);
  for (const [name, value] of Object.entries(params)) {
    if (typeof value !== "number") continue;
    try {
      const p = (device.parameters || []).find(
        (dp: any) => String(dp?.name ?? "").toLowerCase().includes(name.toLowerCase()),
      );
      if (p) await p.setValue(value);
    } catch { /* parameter not available on this device — skip */ }
  }
}

type ToolHandler = (args: Record<string, unknown>, song: any) => ToolResult | Promise<ToolResult>;

function trackOrThrow(song: any, index: number): any {
  const t = song.tracks[index];
  if (!t) throw new Error(`Track ${index} not found`);
  return t;
}

function getDeviceOrThrow(track: any, deviceIndex: number): any {
  const d = track.devices[deviceIndex];
  if (!d) throw new Error(`Device ${deviceIndex} not found`);
  return d;
}

export class ToolRegistry {
  private handlers = new Map<string, ToolHandler>();
  definitions: ToolDefinition[] = [];

  register(def: ToolDefinition, handler: ToolHandler) {
    this.definitions.push(def);
    this.handlers.set(def.name, handler);
  }

  async execute(name: string, args: Record<string, unknown>, song: any): Promise<ToolResult> {
    const handler = this.handlers.get(name);
    if (!handler) return { success: false, error: `Unknown tool: ${name}` };
    try {
      return await handler(args, song);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  getDefinitionsJson(): unknown[] {
    return this.definitions.map(d => ({
      name: d.name,
      description: d.description,
      parameters: Object.fromEntries(
        Object.entries(d.parameters).map(([k, v]) => [k, { type: v.type, description: v.description, enum: v.enum }])
      ),
      required: Object.entries(d.parameters).filter(([, v]) => v.required).map(([k]) => k),
    }));
  }
}

export function createToolRegistry(): ToolRegistry {
  const reg = new ToolRegistry();

  reg.register(
    { name: "get_effects_chains", description: "Get all available effects chains", category: "effects", parameters: {} },
    async (_, song) => ({
      success: true,
      data: {
        chains: [
          {
            id: "pop",
            name: "Pop Master",
            description: "Bright, punchy pop mix with wide stereo and strong bass",
            genre: "pop",
            tracks: ["all"],
            effects: [
              { type: "eq", name: "Master EQ", params: { bandwidth: 0.5, gain: 0 } },
              { type: "compress", name: "Bus Compressor", params: { threshold: -12, ratio: 4, attack: 5, release: 100 } },
              { type: "gate", name: "Noise Gate", params: { threshold: -60, attack: 0, release: 100 } },
              { type: "reverb", name: "Room Reverb", params: { decay: 1.5, mix: 0.15 } },
              { type: "delay", name: "Stereo Delay", params: { time: 500, feedback: 0.2, mix: 0.1 } },
              { type: "limiter", name: "Loudness Limiter", params: { threshold: -0.1, release: 50 } }
            ]
          },
          {
            id: "hiphop",
            name: "Hip-Hop Boom",
            description: "Heavy hip-hop with punchy bass and tight drums",
            genre: "hiphop",
            tracks: ["all"],
            effects: [
              { type: "eq", name: "Heavy Bass EQ", params: { bandwidth: 0.8, gain: 8 } },
              { type: "compress", name: "Bus Compressor", params: { threshold: -18, ratio: 3, attack: 10, release: 200 } },
              { type: "gate", name: "Kick Gate", params: { threshold: -50, attack: 0, release: 50 } },
              { type: "reverb", name: "Concert Reverb", params: { decay: 2.0, mix: 0.2 } },
              { type: "delay", name: "Beat Delay", params: { time: 250, feedback: 0.3, mix: 0.15 } },
              { type: "limiter", name: "Loudness Limiter", params: { threshold: -0.1, release: 50 } }
            ]
          },
          {
            id: "rock",
            name: "Rock Power",
            description: "Powerful rock mix with strong low end and clear mids",
            genre: "rock",
            tracks: ["all"],
            effects: [
              { type: "eq", name: "Rock EQ", params: { bandwidth: 0.7, gain: 3 } },
              { type: "compress", name: "Bus Compressor", params: { threshold: -15, ratio: 3.5, attack: 8, release: 150 } },
              { type: "gate", name: "Drum Gate", params: { threshold: -40, attack: 0, release: 50 } },
              { type: "reverb", name: "Hall Reverb", params: { decay: 2.5, mix: 0.2 } },
              { type: "delay", name: "Slapback Delay", params: { time: 125, feedback: 0.25, mix: 0.12 } },
              { type: "limiter", name: "Loudness Limiter", params: { threshold: -0.1, release: 50 } }
            ]
          },
          {
            id: "jazz",
            name: "Jazz Smooth",
            description: "Smooth jazz with natural reverb and soft compression",
            genre: "jazz",
            tracks: ["all"],
            effects: [
              { type: "eq", name: "Jazz EQ", params: { bandwidth: 0.6, gain: 2 } },
              { type: "compress", name: "Smooth Compressor", params: { threshold: -20, ratio: 2.5, attack: 20, release: 300 } },
              { type: "gate", name: "Ambient Gate", params: { threshold: -70, attack: 0, release: 200 } },
              { type: "reverb", name: "Plate Reverb", params: { decay: 3.0, mix: 0.25 } },
              { type: "delay", name: "Tape Delay", params: { time: 400, feedback: 0.3, mix: 0.18 } },
              { type: "limiter", name: "Loudness Limiter", params: { threshold: -0.1, release: 50 } }
            ]
          },
          {
            id: "electronic",
            name: "Electronic Precision",
            description: "Clean electronic mix with tight compression and wide stereo",
            genre: "electronic",
            tracks: ["all"],
            effects: [
              { type: "eq", name: "Electronic EQ", params: { bandwidth: 0.5, gain: 1 } },
              { type: "compress", name: "Tight Compressor", params: { threshold: -14, ratio: 4, attack: 3, release: 80 } },
              { type: "gate", name: "Noise Gate", params: { threshold: -60, attack: 0, release: 100 } },
              { type: "reverb", name: "Digital Reverb", params: { decay: 1.8, mix: 0.18 } },
              { type: "delay", name: "Stereo Delay", params: { time: 600, feedback: 0.25, mix: 0.15 } },
              { type: "limiter", name: "Loudness Limiter", params: { threshold: -0.1, release: 50 } }
            ]
          }
        ]
      }
    })
  );

  reg.register(
    { name: "apply_effects_chain", description: "Apply a pre-built effects chain to tracks", category: "effects", parameters: { chain_id: { type: "string", description: "Effects chain ID (pop, hiphop, rock, jazz, electronic)", required: true }, track_indices: { type: "array", description: "Track indices to apply chain to (empty = all tracks)", required: false }, customize: { type: "object", description: "Custom parameters to override", required: false } } },
    async (args, song) => {
      const chainId = args.chain_id as string;
      const trackIndices = args.track_indices as number[] || [];
      const customize = args.customize as Record<string, unknown> || {};

      const chains = {
        pop: {
          eq: { bandwidth: 0.5, gain: 0 },
          compress: { threshold: -12, ratio: 4, attack: 5, release: 100 },
          gate: { threshold: -60, attack: 0, release: 100 },
          reverb: { decay: 1.5, mix: 0.15 },
          delay: { time: 500, feedback: 0.2, mix: 0.1 },
          limiter: { threshold: -0.1, release: 50 }
        },
        hiphop: {
          eq: { bandwidth: 0.8, gain: 8 },
          compress: { threshold: -18, ratio: 3, attack: 10, release: 200 },
          gate: { threshold: -50, attack: 0, release: 50 },
          reverb: { decay: 2.0, mix: 0.2 },
          delay: { time: 250, feedback: 0.3, mix: 0.15 },
          limiter: { threshold: -0.1, release: 50 }
        },
        rock: {
          eq: { bandwidth: 0.7, gain: 3 },
          compress: { threshold: -15, ratio: 3.5, attack: 8, release: 150 },
          gate: { threshold: -40, attack: 0, release: 50 },
          reverb: { decay: 2.5, mix: 0.2 },
          delay: { time: 125, feedback: 0.25, mix: 0.12 },
          limiter: { threshold: -0.1, release: 50 }
        },
        jazz: {
          eq: { bandwidth: 0.6, gain: 2 },
          compress: { threshold: -20, ratio: 2.5, attack: 20, release: 300 },
          gate: { threshold: -70, attack: 0, release: 200 },
          reverb: { decay: 3.0, mix: 0.25 },
          delay: { time: 400, feedback: 0.3, mix: 0.18 },
          limiter: { threshold: -0.1, release: 50 }
        },
        electronic: {
          eq: { bandwidth: 0.5, gain: 1 },
          compress: { threshold: -14, ratio: 4, attack: 3, release: 80 },
          gate: { threshold: -60, attack: 0, release: 100 },
          reverb: { decay: 1.8, mix: 0.18 },
          delay: { time: 600, feedback: 0.25, mix: 0.15 },
          limiter: { threshold: -0.1, release: 50 }
        }
      };

      const chain = chains[chainId as keyof typeof chains];
      if (!chain) return { success: false, error: `Effects chain not found: ${chainId}` };

      const tracksToApply = trackIndices.length > 0
        ? trackIndices.map(idx => trackOrThrow(song, idx))
        : song.tracks;

      const applied: Array<{ trackIndex: number; effects: string[] }> = [];

      for (const track of tracksToApply) {
        const trackIndex = song.tracks.indexOf(track);

        if (track.constructor.name === "AudioTrack") {
          await insertFx(track, "eq", { bandwidth: chain.eq.bandwidth as number, gain: chain.eq.gain as number });
          await insertFx(track, "compress", { threshold: chain.compress.threshold as number, ratio: chain.compress.ratio as number, attack: chain.compress.attack as number, release: chain.compress.release as number });
          await insertFx(track, "gate", { threshold: chain.gate.threshold as number, attack: chain.gate.attack as number, release: chain.gate.release as number });
          await insertFx(track, "reverb", { decay: chain.reverb.decay as number, "dry/wet": chain.reverb.mix as number });
          await insertFx(track, "delay", { time: chain.delay.time as number, feedback: chain.delay.feedback as number, "dry/wet": chain.delay.mix as number });
          await insertFx(track, "limiter", { threshold: chain.limiter.threshold as number, release: chain.limiter.release as number });

          applied.push({
            trackIndex,
            effects: ["EQ", "Compressor", "Noise Gate", "Reverb", "Delay", "Limiter"]
          });
        }
      }

      return { success: true, data: { applied } };
    }
  );

  reg.register(
    { name: "get_preset_chains", description: "Get preset effects chains for specific genres", category: "effects", parameters: { genre: { type: "string", description: "Genre (pop, hiphop, rock, jazz, electronic)", required: true } } },
    async (args, _) => {
      const genre = args.genre as string;
      const presets = {
        pop: {
          name: "Pop Master",
          description: "Bright, punchy pop mix",
          tempo: 120,
          key: "C major",
          recommendedFor: ["vocals", "electro", "dance"],
          characteristics: { energy: "high", complexity: "medium", warmth: "warm", brightness: "bright" }
        },
        hiphop: {
          name: "Hip-Hop Boom",
          description: "Heavy hip-hop with punchy bass",
          tempo: 90,
          key: "A minor",
          recommendedFor: ["raps", "beats", "bass-heavy"],
          characteristics: { energy: "high", complexity: "medium", warmth: "warm", brightness: "dark" }
        },
        rock: {
          name: "Rock Power",
          description: "Powerful rock mix",
          tempo: 110,
          key: "E minor",
          recommendedFor: ["guitars", "drums", "vocals"],
          characteristics: { energy: "high", complexity: "medium", warmth: "warm", brightness: "balanced" }
        },
        jazz: {
          name: "Jazz Smooth",
          description: "Smooth jazz with natural reverb",
          tempo: 120,
          key: "F major",
          recommendedFor: ["saxophones", "pianos", "horns"],
          characteristics: { energy: "medium", complexity: "high", warmth: "smooth", brightness: "clean" }
        },
        electronic: {
          name: "Electronic Precision",
          description: "Clean electronic mix",
          tempo: 128,
          key: "C minor",
          recommendedFor: ["synths", "drums", "bass"],
          characteristics: { energy: "high", complexity: "medium", warmth: "clean", brightness: "bright" }
        }
      };

      const preset = presets[genre as keyof typeof presets];
      if (!preset) return { success: false, error: `Preset not found: ${genre}` };

      return { success: true, data: preset };
    }
  );

  reg.register(
    { name: "create_custom_chain", description: "Create a custom effects chain", category: "effects", parameters: { name: { type: "string", description: "Chain name", required: true }, effects: { type: "array", description: "Array of effect configurations", required: true }, target_tracks: { type: "array", description: "Track indices to apply to", required: false } } },
    async (args, song) => {
      const name = args.name as string;
      const effects = args.effects as Array<{ type: string; params: Record<string, unknown> }>;
      const targetTracks = args.target_tracks as number[] || [];

      const tracksToApply = targetTracks.length > 0
        ? targetTracks.map(idx => trackOrThrow(song, idx))
        : song.tracks;

      const created: Array<{ trackIndex: number; effects: string[] }> = [];

      for (const track of tracksToApply) {
        const trackIndex = song.tracks.indexOf(track);

        if (track.constructor.name === "AudioTrack") {
          const appliedEffects: string[] = [];

          for (const effect of effects) {
            switch (effect.type) {
              case "eq":
                await insertFx(track, "eq", { bandwidth: effect.params.bandwidth as number, gain: effect.params.gain as number });
                appliedEffects.push("EQ");
                break;
              case "compress":
                await insertFx(track, "compress", { threshold: effect.params.threshold as number, ratio: effect.params.ratio as number });
                appliedEffects.push("Compressor");
                break;
              case "reverb":
                await insertFx(track, "reverb", { decay: effect.params.decay as number, "dry/wet": effect.params.mix as number });
                appliedEffects.push("Reverb");
                break;
              case "delay":
                await insertFx(track, "delay", { time: effect.params.time as number, feedback: effect.params.feedback as number });
                appliedEffects.push("Delay");
                break;
              case "limiter":
                await insertFx(track, "limiter", { threshold: effect.params.threshold as number });
                appliedEffects.push("Limiter");
                break;
            }
          }

          created.push({ trackIndex, effects: appliedEffects });
        }
      }

      return { success: true, data: { name, created } };
    }
  );

  
  return reg;
}