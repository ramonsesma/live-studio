// Módulo: Sidechain Designer Pro — reutilizado de examples/sidechain-designer-pro
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

  reg.register({ name:"create_sidechain", description:"Create a new sidechain configuration", category:"sidechain", parameters:{ name:{type:"string",description:"Config name",required:true}, trigger_track:{type:"number",description:"Trigger source track index",required:true}, target_track:{type:"number",description:"Target track index",required:true}, depth:{type:"number",description:"Sidechain depth 0-100%",required:false} } },
    async (args: any, song: any) => {
      const trigger = song.tracks[args.trigger_track]; const target = song.tracks[args.target_track];
      return { success:true, data:{ sidechainCreated:true, name:args.name, trigger:trigger?.name||"Unknown", target:target?.name||"Unknown", depth:args.depth||50 } };
    }
  );

  reg.register({ name:"set_curve", description:"Set sidechain ducking curve", category:"sidechain", parameters:{ sidechain_id:{type:"number",description:"Sidechain ID",required:true}, curve_type:{type:"string",description:"Curve type",required:true,enum:["linear","log","exponential","spline"]} } },
    async (args: any) => ({ success:true, data:{ curveSet:true, curve:args.curve_type } })
  );

  reg.register({ name:"set_trigger_source", description:"Set the trigger source for a sidechain", category:"sidechain", parameters:{ sidechain_id:{type:"number",description:"Sidechain ID",required:true}, source:{type:"string",description:"Trigger source type",required:true,enum:["kick","snare","bass","custom"]} } },
    async (args: any) => ({ success:true, data:{ triggerSourceSet:true, source:args.source } })
  );

  reg.register({ name:"set_release", description:"Set release time for sidechain", category:"sidechain", parameters:{ sidechain_id:{type:"number",description:"Sidechain ID",required:true}, release:{type:"number",description:"Release ms",required:true} } },
    async (args: any) => ({ success:true, data:{ releaseSet:true, release:args.release } })
  );

  reg.register({ name:"preview_sidechain", description:"Preview sidechain effect", category:"sidechain", parameters:{ sidechain_id:{type:"number",description:"Sidechain ID",required:true}, duration:{type:"number",description:"Preview seconds",required:false} } },
    async (args: any) => ({ success:true, data:{ previewing:true, sidechainId:args.sidechain_id, duration:args.duration||5 } })
  );

  reg.register({ name:"export_sidechain", description:"Export sidechain config as JSON", category:"sidechain", parameters:{ sidechain_id:{type:"number",description:"Sidechain ID",required:true}, file_name:{type:"string",description:"File name",required:false} } },
    async (args: any) => ({ success:true, data:{ exported:true, sidechainId:args.sidechain_id, file:args.file_name||"sidechain.json" } })
  );

  return reg;
}
