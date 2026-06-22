// Módulo: Controller Mapper — reutilizado de examples/controller-mapper
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

const CONTROLLERS: any[] = [
  { name:"Launchpad Pro", manufacturer:"Novation", type:"grid", width:8, height:8, midiPort:"Launchpad Pro MIDI 1" },
  { name:"Push 3", manufacturer:"Ableton", type:"grid+knobs", width:8, height:8, midiPort:"Push 3 Live Port" },
  { name:"APC40 MkII", manufacturer:"Akai", type:"grid+faders", width:5, height:8, midiPort:"APC40 MIDI 1" },
  { name:"MIDI Fighter 64", manufacturer:"DJ Tech Tools", type:"grid", width:8, height:8, midiPort:"MF64 MIDI" },
  { name:"Arturia KeyLab 61", manufacturer:"Arturia", type:"keys+knobs", width:0, height:0, midiPort:"KeyLab MIDI" }
];

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"detect_controllers", description:"Detect connected MIDI controllers", category:"controller", parameters:{ rescan:{type:"boolean",description:"Force rescan",required:false} } },
    async () => ({ success:true, data:{ controllers:CONTROLLERS } })
  );

  reg.register({ name:"map_control", description:"Map a controller element to a Live parameter", category:"controller", parameters:{ controller:{type:"string",description:"Controller name",required:true}, element:{type:"string",description:"Control element ID (e.g. pad_1_1, knob_3)",required:true}, track_index:{type:"number",description:"Track index",required:true}, parameter:{type:"string",description:"Parameter name to map",required:true}, min:{type:"number",description:"Min value",required:false}, max:{type:"number",description:"Max value",required:false}, curve:{type:"string",description:"Response curve",required:false,enum:["linear","exponential","logarithmic","s-curve"]} } },
    async (args: any) => ({ success:true, data:{ mapped:true, controller:args.controller, element:args.element, parameter:args.parameter, midiLearn:`${args.controller}:${args.element} → Track ${args.track_index}:${args.parameter}`, curve:args.curve||"linear" } })
  );

  
  
  reg.register({ name:"set_feedback", description:"Configure LED feedback for a controller", category:"controller", parameters:{ controller:{type:"string",description:"Controller name",required:true}, mode:{type:"string",description:"Feedback mode",required:false,enum:["off","on","value","velocity","rainbow","custom"]} } },
    async (args: any) => ({ success:true, data:{ feedbackSet:true, controller:args.controller, mode:args.mode||"value", ledsUpdated:64 } })
  );

  return reg;
}
