// Módulo: FX Chain Presets — reutilizado de examples/fx-chain-presets
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

  reg.register({ name:"get_track_devices", description:"List all devices on a track (FX chain)", category:"fx-presets", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const devices = [
        { name:"EQ Eight", type:"AudioEffect", enabled:true, parameters:["Freq 1","Gain 1","Q 1","Freq 2","Gain 2","Q 2"] },
        { name:"Compressor", type:"AudioEffect", enabled:true, parameters:["Threshold","Ratio","Attack","Release","Gain"] },
        { name:"Reverb", type:"AudioEffect", enabled:true, parameters:["Dry/Wet","Room Size","Decay","Diffusion"] }
      ];
      return { success:true, data:{ trackIndex:args.track_index, trackName:track.name, deviceCount:devices.length, devices } };
    }
  );

  reg.register({ name:"save_fx_preset", description:"Save current FX chain as a named preset", category:"fx-presets", parameters:{ name:{type:"string",description:"Preset name",required:true}, track_index:{type:"number",description:"Track index",required:true}, category:{type:"string",description:"Preset category",required:false,enum:["bass","drums","vocals","synth","master","guitar","fx"]} } },
    async (args: any) => ({ success:true, data:{ saved:true, name:args.name, trackIndex:args.track_index, category:args.category||"fx", deviceCount:3, timestamp:new Date().toISOString() } })
  );

  reg.register({ name:"search_presets", description:"Search saved FX chain presets", category:"fx-presets", parameters:{ query:{type:"string",description:"Search query",required:false}, category:{type:"string",description:"Filter by category",required:false,enum:["bass","drums","vocals","synth","master","guitar","fx","all"]} } },
    async (args: any) => {
      const presets = [
        { name:"Punchy Drums", category:"drums", devices:3, date:"2025-01-10" },
        { name:"Warm Bass", category:"bass", devices:4, date:"2025-02-14" },
        { name:"Vocal Clarity", category:"vocals", devices:3, date:"2025-03-01" },
        { name:"Synth Space", category:"synth", devices:5, date:"2025-03-20" }
      ];
      const filtered = args.category && args.category !== "all" ? presets.filter((p: any)=>p.category===args.category) : presets;
      const searched = args.query ? filtered.filter((p: any)=>p.name.toLowerCase().includes(String(args.query).toLowerCase())) : filtered;
      return { success:true, data:{ resultCount:searched.length, presets:searched } };
    }
  );

  reg.register({ name:"apply_fx_preset", description:"Apply a saved FX chain preset to a track", category:"fx-presets", parameters:{ preset_name:{type:"string",description:"Preset name to apply",required:true}, track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any) => ({ success:true, data:{ applied:true, presetName:args.preset_name, trackIndex:args.track_index, devicesCreated:3 } })
  );

  reg.register({ name:"compare_tracks", description:"Compare FX chains between two tracks", category:"fx-presets", parameters:{ track_a:{type:"number",description:"First track index",required:true}, track_b:{type:"number",description:"Second track index",required:true} } },
    async (args: any, song: any) => {
      const a = song.tracks[args.track_a]; const b = song.tracks[args.track_b];
      return { success:true, data:{ trackA:a?.name||`Track ${args.track_a}`, trackB:b?.name||`Track ${args.track_b}`, sharedDevices:["EQ Eight"], uniqueToA:["Compressor"], uniqueToB:["Limiter","Saturator"] } };
    }
  );

  return reg;
}
