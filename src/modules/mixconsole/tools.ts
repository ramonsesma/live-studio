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
      const channels = [];
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i]; const m = t.mixer;
        channels.push({
          index:i, name:t.name||`Track ${i+1}`,
          fader: m?.volume ? await m.volume.getValue() : 0,
          pan: m?.panning ? await m.panning.getValue() : 0.5,
          muted: !!t.mute, soloed: !!t.solo, armed: !!t.arm,
          sends: m?.sends ? await Promise.all(m.sends.map(async (s: any, j: number) => ({ sendIndex:j, value: await s.getValue() }))) : [],
        });
      }
      return { success:true, data:{ channelCount:channels.length, channels } };
    }
  );

  reg.register({ name:"set_fader", description:"Set track fader level", category:"mixer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, level:{type:"number",description:"Fader level 0-1",required:true} } },
    async (args: any, song: any) => {
      const t = song.tracks[args.track_index];
      if (!t?.mixer?.volume) return { success:false, error:`Track ${args.track_index} not found` };
      await t.mixer.volume.setValue(Math.max(0, Math.min(1, args.level)));
      return { success:true, data:{ set:true, trackIndex:args.track_index, level:await t.mixer.volume.getValue() } };
    }
  );

  reg.register({ name:"set_pan", description:"Set track pan position", category:"mixer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, pan:{type:"number",description:"Pan 0 (L) … 0.5 (C) … 1 (R)",required:true} } },
    async (args: any, song: any) => {
      const t = song.tracks[args.track_index];
      if (!t?.mixer?.panning) return { success:false, error:`Track ${args.track_index} not found` };
      await t.mixer.panning.setValue(Math.max(0, Math.min(1, args.pan)));
      return { success:true, data:{ set:true, trackIndex:args.track_index, pan:await t.mixer.panning.getValue() } };
    }
  );

  reg.register({ name:"set_send", description:"Set track send level", category:"mixer", parameters:{ track_index:{type:"number",description:"Track index",required:true}, send_index:{type:"number",description:"Send bus index",required:true}, level:{type:"number",description:"Send level 0-1",required:true} } },
    async (args: any, song: any) => {
      const send = song.tracks[args.track_index]?.mixer?.sends?.[args.send_index];
      if (!send) return { success:false, error:`Send not found` };
      await send.setValue(Math.max(0, Math.min(1, args.level)));
      return { success:true, data:{ set:true, trackIndex:args.track_index, sendIndex:args.send_index, level:await send.getValue() } };
    }
  );

  reg.register({ name:"toggle_mute", description:"Toggle track mute", category:"mixer", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const t = song.tracks[args.track_index];
      if (!t) return { success:false, error:`Track ${args.track_index} not found` };
      t.mute = !t.mute;
      return { success:true, data:{ toggled:true, trackIndex:args.track_index, muted: !!t.mute } };
    }
  );

  reg.register({ name:"toggle_solo", description:"Toggle track solo", category:"mixer", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any, song: any) => {
      const t = song.tracks[args.track_index];
      if (!t) return { success:false, error:`Track ${args.track_index} not found` };
      t.solo = !t.solo;
      return { success:true, data:{ toggled:true, trackIndex:args.track_index, soloed: !!t.solo } };
    }
  );

  return reg;
}
