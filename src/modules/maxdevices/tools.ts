// Módulo: Max Device Manager — reutilizado de examples/max-device-manager
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

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"list_max_devices", description:"List all Max for Live devices in set", category:"max", parameters:{ include_presets:{type:"boolean",description:"Include preset info",required:false} } },
    async (_a: any, song: any) => {
      const devices = (song.tracks||[]).flatMap((t: any, i: number)=> (t.devices||[]).filter((d: any)=>d.type==="max").map((d: any)=>({ trackIndex:i, trackName:t.name||`Track ${i+1}`, name:d.name||"Max Device", maxClass:d.maxClass||"unknown", frozen:d.frozen||false })));
      return { success:true, data:{ devices, count:devices.length } };
    }
  );

  reg.register({ name:"freeze_max_device", description:"Freeze/unfreeze a Max device", category:"max", parameters:{ track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true}, freeze:{type:"boolean",description:"Freeze state",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ frozen:args.freeze, trackName:track?.name||"Unknown", deviceIndex:args.device_index } };
    }
  );

  reg.register({ name:"set_max_parameters", description:"Set multiple Max device parameters", category:"max", parameters:{ track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true}, parameters:{type:"string",description:"JSON param->value map",required:true} } },
    async (args: any) => {
      const params = JSON.parse(args.parameters);
      return { success:true, data:{ paramsSet:true, count:Object.keys(params).length, params } };
    }
  );

  reg.register({ name:"save_max_preset", description:"Save Max device state as preset", category:"max", parameters:{ track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true}, preset_name:{type:"string",description:"Preset name",required:true}, tags:{type:"string",description:"Comma-separated tags",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ saved:true, preset:args.preset_name, trackName:track?.name||"Unknown", tags:args.tags?.split(",")||[] } };
    }
  );

  reg.register({ name:"load_max_preset", description:"Load Max device preset", category:"max", parameters:{ track_index:{type:"number",description:"Track index",required:true}, device_index:{type:"number",description:"Device index",required:true}, preset_name:{type:"string",description:"Preset name",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ loaded:true, preset:args.preset_name, trackName:track?.name||"Unknown" } };
    }
  );

  return reg;
}
