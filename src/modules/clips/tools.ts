// Módulo: Clips & Escenas — auto_tag_clips now derives real tags from each clip's actual notes/
// name instead of a fixed hardcoded list. create_launch_group and launch_scene are honestly
// advisory: the SDK has no launch-group concept and no transport/clip-fire trigger API at all.
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

  reg.register({ name:"create_launch_group", description:"Create a clip launch group (advisory — the SDK has no launch-group / crossfade-group concept)", category:"launch", parameters:{ name:{type:"string",description:"Group name",required:true}, clip_indices:{type:"array",description:"Clip indices to include",required:true}, launch_mode:{type:"string",description:"Launch mode",required:false,enum:["toggle","trigger","gate","repeat"]} } },
    async (args: any) => ({ success:true, data:{ advisory:true, note:"Live's launch groups / legato switching aren't exposed by the SDK — there's no API to create one. Set exclusive/legato launch groups from Live's clip view.", name:args.name, launchMode:args.launch_mode||"toggle", clips:args.clip_indices } })
  );

  reg.register({ name:"auto_tag_clips", description:"Analyze a track's real clips and derive tags from their actual notes/name — optionally write the tags into each clip's name (real clip.name write; Live has no separate tag field)", category:"organization", parameters:{ track_index:{type:"number",description:"Track",required:true}, write_names:{type:"boolean",description:"Append #tags to each clip's name, e.g. \"Drums clip #drums #loop\" (default false — analyze only)",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks?.[args.track_index]; if (!track) return { success:false, error:"Track not found" };
      const clips: any[] = [];
      for (const slot of (track.clipSlots || [])) if (slot?.clip) clips.push(slot.clip);
      for (const c of (track.arrangementClips || [])) if (c) clips.push(c);
      if (!clips.length) return { success:false, error:"No clips on this track." };
      const writeNames = !!args.write_names;
      let renamed = 0;
      const tagged = clips.map((c: any) => {
        const tags: string[] = [];
        const notes = c.notes || [];
        if (c.looping) tags.push("loop");
        if (notes.length) { const pitches = notes.map((n: any) => n.pitch); if (pitches.every((p: number) => p >= 35 && p <= 59)) tags.push("drums"); if (notes.length / Math.max(1, c.duration || 4) > 3) tags.push("dense"); }
        const base = String(c.name || "").replace(/\s*(#[a-z]+\s*)+$/i, ""); // strip tags a previous run appended
        const nm = base.toLowerCase();
        for (const kw of ["intro","verse","chorus","bridge","outro","fill"]) if (nm.includes(kw)) tags.push(kw);
        const unique = [...new Set(tags)];
        if (writeNames && unique.length) {
          try { c.name = `${base} ${unique.map((t) => "#" + t).join(" ")}`; renamed++; } catch { /* name not settable */ }
        }
        return { clip:c.name, tags: unique };
      });
      return { success:true, data:{ analyzed:true, applied:writeNames, renamedClips:renamed, trackIndex:args.track_index, clips:tagged } };
    }
  );

  reg.register({ name:"launch_scene", description:"Launch a scene with all clips (advisory — the SDK has no transport/clip-fire trigger API; this only confirms the scene exists)", category:"launch", parameters:{ scene_index:{type:"number",description:"Scene index",required:true}, quantize:{type:"number",description:"Quantize (unused — no launch API)",required:false} } },
    async (args: any, song: any) => {
      const scene = song.scenes[args.scene_index];
      if (!scene) return { success:false, error:`Scene ${args.scene_index} not found` };
      return { success:true, data:{ advisory:true, note:"There's no transport/clip-fire trigger API in the SDK — Live can't be told to launch a scene from here. Click the scene's launch button in Live.", sceneIndex:args.scene_index, sceneName:scene.name } };
    }
  );

  return reg;
}
