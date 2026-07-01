// Módulo: Group Routing — Track.groupTrack is READ-ONLY in the SDK (no setter, and no
// createGroupTrack API) — there is no way to actually group/ungroup tracks or change a group's
// routing via the SDK. list_groups reads real state; create_group creates a real (ungrouped) audio
// track as a practical bus workaround; everything claiming to group/route/ungroup is advisory.
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

  reg.register({ name:"list_groups", description:"List all group tracks and their members (real — reads Track.groupTrack)", category:"group-routing", parameters:{} },
    async (_a: any, song: any) => {
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

  reg.register({ name:"create_group", description:"Create a bus track as a stand-in for a Group Track (advisory — the SDK has no createGroupTrack/groupTrack setter, so the listed tracks are NOT actually parented under it)", category:"group-routing", parameters:{ name:{type:"string",description:"Group name",required:true}, track_indices:{type:"string",description:"Comma-separated track indices to group",required:true}, return_group:{type:"boolean",description:"Create as return track group",required:false} } },
    async (args: any, song: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      const group = await song.createAudioTrack();
      group.name = args.name;
      return { success:true, data:{ advisory:true, note:"Track.groupTrack has no setter in the SDK — a plain audio track was created as a bus, but the requested tracks are NOT actually grouped under it. Route their outputs to it manually, or group them in Live (Cmd/Ctrl+G).", groupCreated:true, groupName:args.name, groupIndex:song.tracks.indexOf(group), requestedMemberCount:indices.length } };
    }
  );

  reg.register({ name:"add_to_group", description:"Add track(s) to existing group (advisory — the SDK has no API to re-parent a track under a group)", category:"group-routing", parameters:{ group_index:{type:"number",description:"Group track index",required:true}, track_indices:{type:"string",description:"Comma-separated track indices to add",required:true} } },
    async (args: any, song: any) => {
      const indices = String(args.track_indices).split(",").map((s: string)=>parseInt(s.trim())).filter((n: number)=>!isNaN(n));
      const group = song.tracks[args.group_index];
      if (!group) return { success:false, error:"Group track not found" };
      return { success:true, data:{ advisory:true, note:"Track.groupTrack has no setter — tracks can't be re-parented via the SDK. Drag them into the group in Live.", groupName:group.name, requestedTrackCount:indices.length } };
    }
  );

  reg.register({ name:"set_group_routing", description:"Set group track routing options (advisory — audio routing/output-chooser isn't exposed by the SDK; volume/mute ARE real via track.mixer/track.mute)", category:"group-routing", parameters:{ group_index:{type:"number",description:"Group track index",required:true}, audio_to:{type:"string",description:"Route audio to",required:false,enum:["master","another_group","ext_out","sends_only"]}, volume:{type:"number",description:"Group volume (0-1 fader)",required:false}, mute:{type:"boolean",description:"Mute group",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.group_index];
      if (!track) return { success:false, error:"Group track not found" };
      if (typeof args.volume === "number" && track.mixer?.volume) await track.mixer.volume.setValue(Math.max(0, Math.min(1, args.volume)));
      if (typeof args.mute === "boolean") track.mute = args.mute;
      const extra = args.audio_to ? { advisory:true, note:"Output routing (audio_to) isn't exposed by the SDK — set it from the track's I/O row in Live." } : {};
      return { success:true, data:{ routingSet:true, groupIndex:args.group_index, volume:args.volume, muted:!!track.mute, ...extra } };
    }
  );

  reg.register({ name:"ungroup", description:"Ungroup tracks, remove group track (advisory — the SDK has no ungroup/track-deletion-of-groups semantics beyond deleteTrack, and no way to verify member re-parenting)", category:"group-routing", parameters:{ group_index:{type:"number",description:"Group track index",required:true}, keep_content:{type:"boolean",description:"Keep grouped content on tracks",required:false} } },
    async (args: any, song: any) => {
      const group = song.tracks?.[args.group_index];
      if (!group) return { success:false, error:"Group track not found" };
      return { success:true, data:{ advisory:true, note:"There's no ungroup operation in the SDK — press Cmd/Ctrl+G in Live on the selected group to ungroup it, or use trackmanager__ delete on this bus track if it was only a routing stand-in.", groupIndex:args.group_index, groupName:group.name } };
    }
  );

  return reg;
}
