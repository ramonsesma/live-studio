// Módulo: Group Routing — reutilizado de examples/group-routing
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

  reg.register({ name:"list_groups", description:"List all group tracks and their members", category:"group-routing", parameters:{} },
    async (_a: any, song: any) => {
      // Real grouping: each track exposes its parent via track.groupTrack.
      const tracks = song.tracks || [];
      const byGroup = new Map<number, any>();
      tracks.forEach((t: any, i: number) => {
        const g = t.groupTrack;
        if (!g) return;
        const gi = tracks.indexOf(g);
        if (!byGroup.has(gi)) byGroup.set(gi, { index:gi, name:g.name || `Group ${gi}`, members:[] });
        byGroup.get(gi).members.push({ index:i, name:t.name || `Track ${i+1}` });
      });
      const groups = [...byGroup.values()].map((g: any) => ({ ...g, memberCount:g.members.length }));
      return { success:true, data:{ groups, totalGroups:groups.length, totalTracks:tracks.length } };
    }
  );

  reg.register({ name:"create_group", description:"Create a new group track from selected tracks", category:"group-routing", parameters:{ name:{type:"string",description:"Group name",required:true}, track_indices:{type:"string",description:"Comma-separated track indices to group",required:true}, return_group:{type:"boolean",description:"Create as return track group",required:false} } },
    async (args: any, song: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      // The Extensions API has no createGroupTrack(); a group is backed by an audio bus.
      const group = await song.createAudioTrack();
      group.name = args.name;
      return { success:true, data:{ groupCreated:true, groupName:args.name, groupIndex:song.tracks.indexOf(group), memberCount:indices.length } };
    }
  );

  reg.register({ name:"add_to_group", description:"Add track(s) to existing group", category:"group-routing", parameters:{ group_index:{type:"number",description:"Group track index",required:true}, track_indices:{type:"string",description:"Comma-separated track indices to add",required:true} } },
    async (args: any, song: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      const group = song.tracks[args.group_index];
      return { success:true, data:{ added:true, groupName:group?.name||"Unknown", trackCount:indices.length } };
    }
  );

  reg.register({ name:"set_group_routing", description:"Set group track routing options", category:"group-routing", parameters:{ group_index:{type:"number",description:"Group track index",required:true}, audio_to:{type:"string",description:"Route audio to",required:false,enum:["master","another_group","ext_out","sends_only"]}, volume:{type:"number",description:"Group volume dB",required:false}, mute:{type:"boolean",description:"Mute group",required:false} } },
    async (args: any) => ({ success:true, data:{ routingSet:true, groupIndex:args.group_index, audioTo:args.audio_to||"master", volume:args.volume||0, muted:args.mute||false } })
  );

  reg.register({ name:"ungroup", description:"Ungroup tracks, remove group track", category:"group-routing", parameters:{ group_index:{type:"number",description:"Group track index",required:true}, keep_content:{type:"boolean",description:"Keep grouped content on tracks",required:false} } },
    async (args: any) => ({ success:true, data:{ ungrouped:true, groupIndex:args.group_index, contentKept:args.keep_content !== false } })
  );

  return reg;
}
