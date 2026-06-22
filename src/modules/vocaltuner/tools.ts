// Módulo: Vocal Tuner — reutilizado de examples/vocal-tuner
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

  
  
  reg.register({ name:"set_tuning", description:"Set vocal tuning parameters", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, retune_speed:{type:"number",description:"Retune speed ms",required:false}, vibrato_depth:{type:"number",description:"Vibrato depth 0-100",required:false}, vibrato_rate:{type:"number",description:"Vibrato rate Hz",required:false} } },
    async (args: any) => ({ success:true, data:{ configured:true, trackIndex:args.track_index, retuneSpeed:args.retune_speed||20, vibratoDepth:args.vibrato_depth||30, vibratoRate:args.vibrato_rate||5 } })
  );

  
  return reg;
}
