// Módulo: Macro Mapper Pro — the SDK has no MIDI-mapping API at all (no way to link a macro to
// a target parameter with a curve), so create_macro_map/batch_map are honestly advisory. What IS
// real: reading/writing the actual current values of a rack's Macro parameters, and persisting
// them as a preset (src/core/storage.ts) instead of a fake in-memory acknowledgement.
import { saveJson, loadJson, listJson } from "../../core/storage.js";
import { recordParamAt, keyDevice } from "../../core/history.js";
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

const SUB = "macro_presets";
function findMacros(track: any, deviceIndex: number) {
  const dev = track?.devices?.[deviceIndex]; if (!dev) return null;
  const macros = (dev.parameters || []).filter((p: any) => /^Macro/i.test(p.name));
  return { dev, macros };
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"create_macro_map", description:"Map a parameter to a macro with curve/range (advisory — the SDK has no MIDI-mapping API; set the macro's value directly instead with set_macro)", category:"macros", parameters:{ track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true}, parameter_name:{type:"string",description:"Parameter name",required:true}, macro_index:{type:"number",description:"Target macro index 0-7",required:true}, min:{type:"number",description:"Min value",required:false}, max:{type:"number",description:"Max value",required:false}, curve:{type:"string",description:"Mapping curve",required:false,enum:["linear","exponential","logarithmic","s-curve","step"]} } },
    async (args: any) => ({ success:true, data:{ advisory:true, note:"Live's mapping engine isn't exposed by the SDK — there's no API to link a macro to a target parameter. Map it manually in Live (right-click → Map), or use macros__set_macro to set the macro's current value.", trackIndex:args.track_index, macroIndex:args.macro_index, parameter:args.parameter_name, curve:args.curve||"linear" } })
  );

  reg.register({ name:"set_macro", description:"Set a rack's macro to a real value (undoable)", category:"macros", parameters:{ track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true}, macro_index:{type:"number",description:"Macro index 0-7",required:true}, value:{type:"number",description:"Value 0-127",required:true} } },
    async (args: any, song: any) => {
      const found = findMacros(song.tracks?.[args.track_index], args.device_index);
      if (!found) return { success:false, error:"Device not found" };
      const m = found.macros[args.macro_index];
      if (!m) return { success:false, error:`Macro ${args.macro_index} not found on "${found.dev.name}" (has ${found.macros.length} macros — is it a Rack?)` };
      await recordParamAt(m, keyDevice(args.track_index, args.device_index), "macros.set_macro");
      await m.setValue(Math.max(m.min, Math.min(m.max, args.value)));
      return { success:true, data:{ set:true, macroIndex:args.macro_index, name:m.name, value:await m.getValue() } };
    }
  );

  reg.register({ name:"save_macro_preset", description:"Save the rack's real current macro values as a preset (persists to disk)", category:"macros", parameters:{ name:{type:"string",description:"Preset name",required:true}, track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true} } },
    async (args: any, song: any) => {
      const found = findMacros(song.tracks?.[args.track_index], args.device_index);
      if (!found) return { success:false, error:"Device not found" };
      const values = await Promise.all(found.macros.map(async (m: any) => ({ name:m.name, value: await m.getValue() })));
      const id = `preset_${Date.now()}`;
      saveJson(SUB, id, { id, name:args.name, deviceName:found.dev.name, trackIndex:args.track_index, deviceIndex:args.device_index, timestamp:new Date().toISOString(), values });
      return { success:true, data:{ saved:true, presetId:id, name:args.name, macroCount:values.length } };
    }
  );

  reg.register({ name:"batch_map", description:"Map multiple parameters to macros at once (advisory — the SDK has no MIDI-mapping API)", category:"macros", parameters:{ track_index:{type:"number",description:"Track index",required:true}, mapping_string:{type:"string",description:"JSON array of mappings [{param, macro, min, max}]",required:true} } },
    async (args: any) => {
      let mappings: any[] = [];
      try { mappings = JSON.parse(args.mapping_string); } catch { return { success:false, error:"Invalid JSON" }; }
      return { success:true, data:{ advisory:true, note:"Live's mapping engine isn't exposed by the SDK — none of these mappings could actually be created. Map them manually in Live.", trackIndex:args.track_index, mappingCount:mappings.length } };
    }
  );

  reg.register({ name:"list_macro_presets", description:"List saved macro presets", category:"macros", parameters:{} },
    async () => ({ success:true, data:{ presets: listJson(SUB) } })
  );

  return reg;
}
