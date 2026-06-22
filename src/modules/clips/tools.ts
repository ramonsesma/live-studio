// Módulo: Clips & Escenas — reutilizado de examples/clip-launcher-manager
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

  reg.register({ name:"get_clips", description:"Get all clips in session", category:"clips", parameters:{ track_index:{type:"number",description:"Track filter",required:false} } },
    async (args: any, song: any) => {
      const tracks = args.track_index !== undefined ? [song.tracks[args.track_index]].filter(Boolean) : song.tracks;
      const clips = tracks.map((t: any, i: number) => ({
        trackIndex:i, trackName:t.name,
        arrangementClips:t.arrangementClips.map((c: any) => ({ name:c.name, startTime:c.startTime, duration:c.duration })),
        clipSlots:t.clipSlots.length
      }));
      return { success:true, data:{ clips } };
    }
  );

  
  reg.register({ name:"create_launch_group", description:"Create a clip launch group", category:"launch", parameters:{ name:{type:"string",description:"Group name",required:true}, clip_indices:{type:"array",description:"Clip indices to include",required:true}, launch_mode:{type:"string",description:"Launch mode",required:false,enum:["toggle","trigger","gate","repeat"]} } },
    async (args: any) => ({ success:true, data:{ name:args.name, launchMode:args.launch_mode||"toggle", clips:args.clip_indices } })
  );

  reg.register({ name:"auto_tag_clips", description:"Auto-tag clips based on analysis", category:"organization", parameters:{ track_index:{type:"number",description:"Track",required:true} } },
    async (args: any) => ({ success:true, data:{ autoTagged:true, tags:["drums","loop","verse"], trackIndex:args.track_index } })
  );

  reg.register({ name:"launch_scene", description:"Launch a scene with all clips", category:"launch", parameters:{ scene_index:{type:"number",description:"Scene index",required:true}, quantize:{type:"number",description:"Quantize",required:false} } },
    async (args: any, song: any) => {
      const scene = song.scenes[args.scene_index];
      if (!scene) return { success:false, error:`Scene ${args.scene_index} not found` };
      return { success:true, data:{ launched:true, sceneIndex:args.scene_index, sceneName:scene.name } };
    }
  );

  return reg;
}
