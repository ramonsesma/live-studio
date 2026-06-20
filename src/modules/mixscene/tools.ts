// Módulo: Mix Scene Saver — reutilizado de examples/mix-scene-saver
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
  const scenes: any[] = [];

  reg.register({ name:"save_scene", description:"Save current mixer state as a scene", category:"mix-scene", parameters:{ name:{type:"string",description:"Scene name",required:true}, snapshot_tracks:{type:"string",description:"Comma-separated track indices, or 'all'",required:false}, include_volume:{type:"boolean",description:"Snapshot volume",required:false}, include_pan:{type:"boolean",description:"Snapshot pan",required:false}, include_mute:{type:"boolean",description:"Snapshot mute/solo",required:false}, include_sends:{type:"boolean",description:"Snapshot send levels",required:false}, include_devices:{type:"boolean",description:"Snapshot device params",required:false} } },
    async (args: any, song: any) => {
      const snapshot = {
        id:scenes.length+1, name:args.name, timestamp:new Date().toISOString(),
        tracks:(song.tracks||[]).slice(0,5).map((t: any, i: number) => ({ index:i, name:t.name||`Track ${i+1}`, volume:-6+Math.random()*12, pan:Math.random()*2-1, muted:false, solo:false, sends:[0.5,0.3] }))
      };
      scenes.push(snapshot);
      return { success:true, data:{ sceneSaved:true, sceneId:snapshot.id, sceneName:args.name, trackCount:(song.tracks||[]).length } };
    }
  );

  reg.register({ name:"recall_scene", description:"Recall a saved mix scene", category:"mix-scene", parameters:{ scene_id:{type:"number",description:"Scene ID to recall",required:true}, fade_time:{type:"number",description:"Fade/transition time ms",required:false} } },
    async (args: any) => {
      const scene = scenes.find((s: any) => s.id === args.scene_id);
      if (!scene) return { success:false, error:`Scene ${args.scene_id} not found` };
      return { success:true, data:{ sceneRecalled:true, sceneName:scene.name, fadeTime:args.fade_time||0, transition:(args.fade_time||0)>0 ? "crossfade" : "instant" } };
    }
  );

  reg.register({ name:"list_scenes", description:"List saved mix scenes", category:"mix-scene", parameters:{} },
    async () => ({ success:true, data:{ scenes, totalScenes:scenes.length } })
  );

  reg.register({ name:"delete_scene", description:"Delete a saved scene", category:"mix-scene", parameters:{ scene_id:{type:"number",description:"Scene ID to delete",required:true} } },
    async (args: any) => {
      const idx = scenes.findIndex((s: any) => s.id === args.scene_id);
      if (idx === -1) return { success:false, error:`Scene ${args.scene_id} not found` };
      scenes.splice(idx, 1);
      return { success:true, data:{ deleted:true, sceneId:args.scene_id } };
    }
  );

  reg.register({ name:"compare_scenes", description:"Compare two mix scenes", category:"mix-scene", parameters:{ scene_a_id:{type:"number",description:"First scene ID",required:true}, scene_b_id:{type:"number",description:"Second scene ID",required:true} } },
    async (args: any) => {
      const a = scenes.find((s: any) => s.id === args.scene_a_id);
      const b = scenes.find((s: any) => s.id === args.scene_b_id);
      return { success:true, data:{ differences:a&&b?[
        { track:"Track 1", param:"Volume", a:a.tracks[0]?.volume, b:b.tracks[0]?.volume, diff:b.tracks[0]?.volume-a.tracks[0]?.volume }
      ]:[], sceneA:a?.name, sceneB:b?.name } };
    }
  );

  return reg;
}
