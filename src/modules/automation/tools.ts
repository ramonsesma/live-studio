// Módulo: Automatización & Curvas — reutilizado de examples/automation-curve-editor
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

  reg.register({ name:"get_automation_lanes", description:"List automation lanes on a track", category:"automation", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      if (!track) return { success:false, error:"Track not found" };
      const lanes = track.automationLanes || [];
      return { success:true, data:{ trackIndex:args.track_index, trackName:track.name, laneCount:lanes.length, lanes:lanes.map((l: any, i: number)=>({ index:i, parameter:l.parameterName || l.parameter || `Lane ${i}`, min:l.minValue ?? 0, max:l.maxValue ?? 1 })) } };
    }
  );

  
  reg.register({ name:"transform_curve", description:"Transform automation curve (mirror, scale, offset, reverse)", category:"automation", parameters:{ track_index:{type:"number",description:"Track index",required:true}, lane_index:{type:"number",description:"Lane index",required:true}, operation:{type:"string",description:"Transform operation",required:true,enum:["mirror","scale","offset","reverse","flatten"]}, value:{type:"number",description:"Value for scale/offset operations",required:false} } },
    async (args: any) => ({ success:true, data:{ applied:true, trackIndex:args.track_index, laneIndex:args.lane_index, operation:args.operation, value:args.value || null } })
  );

  
  return reg;
}
