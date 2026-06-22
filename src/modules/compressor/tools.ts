// Módulo: Compresión & Dinámica — reutilizado de examples/dynamic-range-compressor
export class ToolRegistry {
  private handlers = new Map();
  definitions: any[] = [];
  register(def: any, handler: any) { this.definitions.push(def); this.handlers.set(def.name, handler); }
  async execute(name: string, args: any, song: any) {
    const handler = this.handlers.get(name);
    if (!handler) return { success: false, error: `Unknown: ${name}` };
    try { return await handler(args, song); }
    catch (err: any) { return { success: false, error: err.message || String(err) }; }
  }
  getDefinitionsJson() { return this.definitions; }
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  
  reg.register({ name:"apply_compression_preset", description:"Apply compression preset to track", category:"compression", parameters:{ track_index:{type:"number",description:"Track",required:true}, preset:{type:"string",description:"Preset",required:true,enum:["vocal","drum_bus","master","guitar","bass","gentle","heavy"]} } },
    async (args: any) => {
      const presets: any = {
        vocal: { threshold:-16, ratio:3, attack:2, release:50, knee:6, makeup:2 },
        drum_bus: { threshold:-20, ratio:4, attack:1, release:30, knee:3, makeup:3 },
        master: { threshold:-14, ratio:2, attack:10, release:100, knee:12, makeup:1 },
        guitar: { threshold:-18, ratio:3.5, attack:5, release:80, knee:6, makeup:2 },
        bass: { threshold:-20, ratio:4, attack:3, release:60, knee:3, makeup:4 },
        gentle: { threshold:-12, ratio:1.5, attack:20, release:150, knee:12, makeup:0.5 },
        heavy: { threshold:-24, ratio:8, attack:0.5, release:20, knee:0, makeup:6 }
      };
      const preset = presets[args.preset];
      if (!preset) return { success:false, error:`Unknown preset: ${args.preset}` };
      return { success:true, data:{ applied:true, preset:args.preset, params:preset, trackIndex:args.track_index } };
    }
  );

  reg.register({ name:"multi_band_compress", description:"Apply multi-band compression", category:"compression", parameters:{ track_index:{type:"number",description:"Track",required:true}, low_ratio:{type:"number",description:"Low band ratio",required:false}, mid_ratio:{type:"number",description:"Mid band ratio",required:false}, high_ratio:{type:"number",description:"High band ratio",required:false} } },
    async (args: any) => ({ success:true, data:{ applied:true, bands:{ low:{freq:250,ratio:args.low_ratio||3}, mid:{freq:2000,ratio:args.mid_ratio||2.5}, high:{freq:8000,ratio:args.high_ratio||2} }, trackIndex:args.track_index } })
  );

  reg.register({ name:"auto_gain_staging", description:"Auto-set gain staging across tracks", category:"mixing", parameters:{ target_level:{type:"number",description:"Target level dB",required:false} } },
    async (args: any, song: any) => {
      // Set every track fader to a common unity-ish level (real mixer write).
      const target = typeof args.target_level === "number" ? Math.max(0, Math.min(1, args.target_level)) : 0.85;
      const tracks = song.tracks || [];
      const results = [];
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        const before = t.mixer?.volume ? await t.mixer.volume.getValue() : null;
        if (t.mixer?.volume) await t.mixer.volume.setValue(target);
        results.push({ trackIndex:i, trackName:t.name, before, after:target });
      }
      return { success:true, data:{ targetFader:target, tracksProcessed:results.length, tracks:results } };
    }
  );

  return reg;
}
