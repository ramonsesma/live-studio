// Módulo: Synth Patchbay — this is the extension's own virtual patchbay concept (no Live device
// graph is involved), so it's not "fake" in the sense of misrepresenting Live — but the previous
// in-memory array lost the patch on every restart. Persisted now (src/core/storage.ts), and
// connect_ports validates that both module IDs actually exist.
import { saveJson, loadJson } from "../../core/storage.js";
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

const SUB = "synth_patchbay";
const STATE_ID = "state";
function load() { return loadJson(SUB, STATE_ID) || { modules: [], connections: [] }; }
function save(s: any) { saveJson(SUB, STATE_ID, s); }

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"add_module", description:"Add a module to the patchbay (persists to disk)", category:"patchbay", parameters:{ type:{type:"string",description:"Module type",required:true,enum:["oscillator","filter","envelope","lfo","vca","mixer","sequencer","delay","reverb","custom"]}, position_x:{type:"number",description:"X position",required:false}, position_y:{type:"number",description:"Y position",required:false} } },
    async (args: any) => {
      const state = load();
      const mod = { id:state.modules.length+1, type:args.type, x:args.position_x||100, y:args.position_y||100, params:{} };
      state.modules.push(mod); save(state);
      return { success:true, data:{ moduleAdded:true, module:mod, totalModules:state.modules.length } };
    }
  );

  reg.register({ name:"connect_ports", description:"Connect output to input (persists to disk; validates both module IDs exist)", category:"patchbay", parameters:{ from_module:{type:"number",description:"Source module ID",required:true}, from_port:{type:"string",description:"Output port name",required:true}, to_module:{type:"number",description:"Target module ID",required:true}, to_port:{type:"string",description:"Input port name",required:true}, cable_color:{type:"string",description:"Cable color",required:false} } },
    async (args: any) => {
      const state = load();
      if (!state.modules.find((m: any) => m.id === args.from_module)) return { success:false, error:`Module ${args.from_module} not found` };
      if (!state.modules.find((m: any) => m.id === args.to_module)) return { success:false, error:`Module ${args.to_module} not found` };
      const conn = { from:`${args.from_module}.${args.from_port}`, to:`${args.to_module}.${args.to_port}`, color:args.cable_color||"#FF6B6B" };
      state.connections.push(conn); save(state);
      return { success:true, data:{ connected:true, ...conn } };
    }
  );

  reg.register({ name:"signal_flow_visual", description:"Get the persisted signal flow for visualization", category:"patchbay", parameters:{} },
    async () => {
      const state = load();
      return { success:true, data:{ modules:state.modules.map((m: any)=>({ id:m.id, type:m.type, x:m.x, y:m.y })), connections:state.connections } };
    }
  );

  return reg;
}
