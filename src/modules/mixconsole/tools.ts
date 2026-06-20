// Módulo: Mix Console View — reutilizado de examples/mix-console-view
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

  reg.register({ name:"get_mixer_state", description:"Get full mixer state for all tracks", category:"mixer", parameters:{} },
    async (_a: any, song: any) => {
      const tracks = song.tracks || [];
      const channels = tracks.map((t: any, i: number) => ({
        index:i, name:t.name||`Track ${i+1}`, fader:Math.random(), pan:(Math.random()*2-1),
        muted:false, soloed:false, armed:i===0,
        sends:Array.from({length:4}, (_, j)=>({ sendIndex:j, value:Math.random() })),
        vuMeter:Math.random(), peak:Math.random()*0.3
      }));
      return { success:true, data:{ channelCount:channels.length, masterFader:0.85, masterVu:0.6, channels } };
    }
  );

  reg.register({ name:"set_fader", description:"Set track fader level", category:"mixer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, level:{type:"number",description:"Fader level 0-1 (use -1 for -inf)",required:true} } },
    async (args: any) => ({ success:true, data:{ set:true, trackIndex:args.track_index, level:args.level, dB:args.level > 0 ? `${Math.round((args.level*40-40)*10)/10} dB` : "-∞ dB" } })
  );

  reg.register({ name:"set_pan", description:"Set track pan position", category:"mixer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, pan:{type:"number",description:"Pan -1 (L) to 1 (R)",required:true} } },
    async (args: any) => ({ success:true, data:{ set:true, trackIndex:args.track_index, pan:args.pan, label:args.pan < -0.3 ? "Left" : args.pan > 0.3 ? "Right" : "Center" } })
  );

  reg.register({ name:"set_send", description:"Set track send level", category:"mixer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, send_index:{type:"number",description:"Send bus index (0-3)",required:true}, level:{type:"number",description:"Send level 0-1",required:true} } },
    async (args: any) => ({ success:true, data:{ set:true, trackIndex:args.track_index, sendIndex:args.send_index, level:args.level } })
  );

  reg.register({ name:"toggle_mute", description:"Toggle track mute", category:"mixer", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any) => ({ success:true, data:{ toggled:true, trackIndex:args.track_index, muted:Math.random()>0.5 } })
  );

  reg.register({ name:"toggle_solo", description:"Toggle track solo", category:"mixer", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any) => ({ success:true, data:{ toggled:true, trackIndex:args.track_index, soloed:Math.random()>0.5 } })
  );

  return reg;
}
