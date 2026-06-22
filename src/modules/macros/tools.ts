// Módulo: Macro Mapper Pro — reutilizado de examples/macro-mapper-pro
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

  
  reg.register({ name:"create_macro_map", description:"Create a custom macro mapping with curve and range", category:"macros", parameters:{ track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true}, parameter_name:{type:"string",description:"Parameter name",required:true}, macro_index:{type:"number",description:"Target macro index 0-7",required:true}, min:{type:"number",description:"Min value",required:false}, max:{type:"number",description:"Max value",required:false}, curve:{type:"string",description:"Mapping curve",required:false,enum:["linear","exponential","logarithmic","s-curve","step"]} } },
    async (args: any) => ({ success:true, data:{ created:true, trackIndex:args.track_index, macroIndex:args.macro_index, parameter:args.parameter_name, curve:args.curve||"linear", min:args.min||0, max:args.max||1 } })
  );

  reg.register({ name:"save_macro_preset", description:"Save current macro configuration as a preset", category:"macros", parameters:{ name:{type:"string",description:"Preset name",required:true}, track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any) => ({ success:true, data:{ saved:true, name:args.name, trackIndex:args.track_index, timestamp:new Date().toISOString(), macroCount:8 } })
  );

  reg.register({ name:"batch_map", description:"Map multiple parameters to macros at once", category:"macros", parameters:{ track_index:{type:"number",description:"Track index",required:true}, mapping_string:{type:"string",description:"JSON array of mappings [{param, macro, min, max}]",required:true} } },
    async (args: any) => {
      let mappings: any[] = [];
      try { mappings = JSON.parse(args.mapping_string); } catch { return { success:false, error:"Invalid JSON" }; }
      return { success:true, data:{ applied:true, trackIndex:args.track_index, mappingCount:mappings.length } };
    }
  );

  return reg;
}
