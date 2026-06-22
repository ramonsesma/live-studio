// Módulo: Synth Patchbay — reutilizado de examples/modular-synth-patchbay
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
  const modules: any[] = [];

  reg.register({ name:"add_module", description:"Add a module to the patchbay", category:"patchbay", parameters:{ type:{type:"string",description:"Module type",required:true,enum:["oscillator","filter","envelope","lfo","vca","mixer","sequencer","delay","reverb","custom"]}, position_x:{type:"number",description:"X position",required:false}, position_y:{type:"number",description:"Y position",required:false} } },
    async (args: any) => {
      const mod = { id:modules.length+1, type:args.type, x:args.position_x||100, y:args.position_y||100, params:{} };
      modules.push(mod);
      return { success:true, data:{ moduleAdded:true, module:mod, totalModules:modules.length } };
    }
  );

  reg.register({ name:"connect_ports", description:"Connect output to input", category:"patchbay", parameters:{ from_module:{type:"number",description:"Source module ID",required:true}, from_port:{type:"string",description:"Output port name",required:true}, to_module:{type:"number",description:"Target module ID",required:true}, to_port:{type:"string",description:"Input port name",required:true}, cable_color:{type:"string",description:"Cable color",required:false} } },
    async (args: any) => ({ success:true, data:{ connected:true, from:`${args.from_module}.${args.from_port}`, to:`${args.to_module}.${args.to_port}`, color:args.cable_color||"#FF6B6B" } })
  );

  
  
  reg.register({ name:"signal_flow_visual", description:"Get signal flow for visualization", category:"patchbay", parameters:{} },
    async () => ({
      success:true, data:{
        modules:modules.map((m: any)=>({ id:m.id, type:m.type, x:m.x, y:m.y })),
        connections:modules.slice(0,-1).map((m: any, i: number)=>({ from:`${m.id}.out`, to:`${modules[i+1].id}.in` }))
      }
    })
  );

  return reg;
}
