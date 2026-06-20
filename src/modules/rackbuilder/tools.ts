// Módulo: Rack Builder — reutilizado de examples/rack-builder
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

  reg.register({ name:"create_rack", description:"Create a new Instrument/Effect rack on a track", category:"rack", parameters:{ track_index:{type:"number",description:"Track index",required:true}, rack_type:{type:"string",description:"Rack type",required:true,enum:["instrument","effect","drum"]}, name:{type:"string",description:"Rack name",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      return { success:true, data:{ created:true, trackIndex:args.track_index, rackType:args.rack_type, name:args.name, chainCount:1, macroCount:8 } };
    }
  );

  reg.register({ name:"add_chain", description:"Add a chain to a rack", category:"rack", parameters:{ track_index:{type:"number",description:"Track index",required:true}, rack_index:{type:"number",description:"Rack index (0 = first device)",required:true}, name:{type:"string",description:"Chain name",required:true}, key_zone_min:{type:"number",description:"Key zone min (0-127)",required:false}, key_zone_max:{type:"number",description:"Key zone max (0-127)",required:false}, velocity_min:{type:"number",description:"Velocity min",required:false}, velocity_max:{type:"number",description:"Velocity max",required:false} } },
    async (args: any) => ({ success:true, data:{ added:true, chainName:args.name, keyZone:[args.key_zone_min||0, args.key_zone_max||127], velocityRange:[args.velocity_min||0, args.velocity_max||127], chainIndex:"new" } })
  );

  reg.register({ name:"configure_macro", description:"Configure a rack macro control", category:"rack", parameters:{ track_index:{type:"number",description:"Track index",required:true}, rack_index:{type:"number",description:"Rack index",required:true}, macro_index:{type:"number",description:"Macro index 0-7",required:true}, name:{type:"string",description:"Macro name",required:false}, min:{type:"number",description:"Min value",required:false}, max:{type:"number",description:"Max value",required:false} } },
    async (args: any) => ({ success:true, data:{ configured:true, macroIndex:args.macro_index, name:args.name||`Macro ${args.macro_index+1}`, min:args.min||0, max:args.max||127 } })
  );

  reg.register({ name:"get_rack_structure", description:"Get the full structure of a rack", category:"rack", parameters:{ track_index:{type:"number",description:"Track index",required:true}, rack_index:{type:"number",description:"Rack index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ trackName:track?.name||"Unknown", rackIndex:args.rack_index, chains:[
        { name:"Chain 1", devices:["Device A","Device B"], keyRange:"C-1 - G8", velocityRange:"1-127" },
        { name:"Chain 2", devices:["Device C"], keyRange:"C-1 - G8", velocityRange:"1-127" }
      ], macros:Array.from({length:8}, (_, i)=>({ index:i, name:`Macro ${i+1}`, value:0 })) } };
    }
  );

  return reg;
}
