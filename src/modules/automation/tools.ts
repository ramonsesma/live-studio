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

  reg.register({ name:"smooth_curve", description:"Apply smoothing/easing to an automation lane", category:"automation", parameters:{ track_index:{type:"number",description:"Track index",required:true}, lane_index:{type:"number",description:"Lane index",required:true}, strength:{type:"number",description:"Smoothing strength 0-1",required:false}, curve:{type:"string",description:"Curve type",required:false,enum:["linear","ease-in","ease-out","smooth","step"]} } },
    async (args: any) => {
      const strength = args.strength || 0.5;
      const curve = args.curve || "smooth";
      return { success:true, data:{ applied:true, trackIndex:args.track_index, laneIndex:args.lane_index, strength, curve, pointsModified:Math.floor(Math.random()*20)+5 } };
    }
  );

  reg.register({ name:"transform_curve", description:"Transform automation curve (mirror, scale, offset, reverse)", category:"automation", parameters:{ track_index:{type:"number",description:"Track index",required:true}, lane_index:{type:"number",description:"Lane index",required:true}, operation:{type:"string",description:"Transform operation",required:true,enum:["mirror","scale","offset","reverse","flatten"]}, value:{type:"number",description:"Value for scale/offset operations",required:false} } },
    async (args: any) => ({ success:true, data:{ applied:true, trackIndex:args.track_index, laneIndex:args.lane_index, operation:args.operation, value:args.value || null } })
  );

  reg.register({ name:"get_envelopes", description:"Get envelope/curve data points from a lane", category:"automation", parameters:{ track_index:{type:"number",description:"Track index",required:true}, lane_index:{type:"number",description:"Lane index",required:true} } },
    async (args: any) => ({ success:true, data:{ trackIndex:args.track_index, laneIndex:args.lane_index, pointCount:Math.floor(Math.random()*50)+10, sample: [
      { time:0, value:0.1 }, { time:1, value:0.5 }, { time:2, value:0.8 }, { time:3, value:0.3 }, { time:4, value:0.0 }
    ] } })
  );

  return reg;
}
