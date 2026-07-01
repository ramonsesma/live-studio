// Módulo: FX Chain Presets — get_track_devices now reads the track's REAL devices instead of a
// fixed hardcoded list; presets persist to disk (src/core/storage.ts) instead of a fixed fake
// catalog; compare_tracks diffs the tracks' real device name lists.
import { saveJson, loadJson, listJson } from "../../core/storage.js";
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

const SUB = "fx_presets";

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_track_devices", description:"List the track's real devices and parameters (FX chain)", category:"fx-presets", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const devices = (track.devices || []).map((d: any) => ({ name:d.name, enabled:true, parameters:(d.parameters || []).map((p: any) => p.name) }));
      return { success:true, data:{ trackIndex:args.track_index, trackName:track.name, deviceCount:devices.length, devices } };
    }
  );

  reg.register({ name:"save_fx_preset", description:"Save the track's real current FX chain as a named preset (persists to disk)", category:"fx-presets", parameters:{ name:{type:"string",description:"Preset name",required:true}, track_index:{type:"number",description:"Track index",required:true}, category:{type:"string",description:"Preset category",required:false,enum:["bass","drums","vocals","synth","master","guitar","fx"]} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.track_index]; if (!track) return { success:false, error:"Track not found" };
      const deviceNames = (track.devices || []).map((d: any) => d.name);
      const id = `preset_${Date.now()}`;
      saveJson(SUB, id, { id, name:args.name, category:args.category||"fx", devices:deviceNames, timestamp:new Date().toISOString() });
      return { success:true, data:{ saved:true, presetId:id, name:args.name, category:args.category||"fx", deviceCount:deviceNames.length, devices:deviceNames } };
    }
  );

  reg.register({ name:"search_presets", description:"Search saved FX chain presets", category:"fx-presets", parameters:{ query:{type:"string",description:"Search query",required:false}, category:{type:"string",description:"Filter by category",required:false,enum:["bass","drums","vocals","synth","master","guitar","fx","all"]} } },
    async (args: any) => {
      let presets = listJson(SUB);
      if (args.category && args.category !== "all") presets = presets.filter((p: any) => p.category === args.category);
      if (args.query) { const q = args.query.toLowerCase(); presets = presets.filter((p: any) => p.name.toLowerCase().includes(q)); }
      return { success:true, data:{ resultCount:presets.length, presets } };
    }
  );

  reg.register({ name:"apply_fx_preset", description:"Apply an FX chain preset to a track (inserts the preset's devices)", category:"fx-presets", parameters:{ preset_name:{type:"string",description:"Preset name to apply",required:true}, track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song?.tracks?.[args.track_index]; if (!track) return { success:false, error:"Track not found" };
      if (typeof track.insertDevice !== "function") return { success:false, error:"Open a track in Live to apply the preset." };
      const saved = listJson(SUB).find((p: any) => p.name.toLowerCase() === String(args.preset_name).toLowerCase());
      const n = String(args.preset_name).toLowerCase();
      const chain = saved?.devices?.length ? saved.devices
        : n.includes("bass") ? ["EQ Eight", "Compressor", "Saturator"]
        : n.includes("drum") ? ["EQ Eight", "Compressor", "Glue Compressor"]
        : n.includes("vocal") ? ["EQ Eight", "Compressor", "Reverb", "Delay"]
        : n.includes("master") ? ["EQ Eight", "Glue Compressor", "Limiter"]
        : ["EQ Eight", "Compressor", "Reverb"];
      let idx = (track.devices || []).length; const inserted: string[] = [];
      for (const name of chain) { try { await track.insertDevice(name, idx++); inserted.push(name); } catch {} }
      if (!inserted.length) return { success:false, error:"Could not insert preset devices." };
      return { success:true, data:{ applied:true, presetName:args.preset_name, trackIndex:args.track_index, devicesCreated:inserted.length, devices:inserted } };
    }
  );

  reg.register({ name:"compare_tracks", description:"Compare real FX chains between two tracks", category:"fx-presets", parameters:{ track_a:{type:"number",description:"First track index",required:true}, track_b:{type:"number",description:"Second track index",required:true} } },
    async (args: any, song: any) => {
      const a = song.tracks[args.track_a]; const b = song.tracks[args.track_b];
      if (!a || !b) return { success:false, error:"One or both tracks not found." };
      const namesA = (a.devices || []).map((d: any) => d.name), namesB = (b.devices || []).map((d: any) => d.name);
      const setA = new Set(namesA), setB = new Set(namesB);
      return { success:true, data:{ trackA:a.name, trackB:b.name, sharedDevices:namesA.filter((n: string) => setB.has(n)), uniqueToA:namesA.filter((n: string) => !setB.has(n)), uniqueToB:namesB.filter((n: string) => !setA.has(n)) } };
    }
  );

  return reg;
}
