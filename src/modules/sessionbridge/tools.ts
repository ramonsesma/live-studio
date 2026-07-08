// Módulo: Session → Arrangement Bridge — lays every Session-view clip onto the Arrangement
// timeline, scene by scene. MIDI clips are recreated with their notes; audio clips are placed
// from their filePath. Uses Track.createMidiClip(startTime, duration) / createAudioClip — the
// SDK's arrangement-clip constructors. Additive (creates clips), so no undo snapshot needed.
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

function clipLen(clip: any): number {
  if (typeof clip?.duration === "number" && clip.duration > 0) return clip.duration;
  if (Array.isArray(clip?.notes) && clip.notes.length) return Math.max(1, ...clip.notes.map((n: any) => n.startTime + (n.duration || 0)));
  return 4;
}
function sceneCount(tracks: any[]): number { return tracks.reduce((m, t) => Math.max(m, (t.clipSlots || []).length), 0); }
function kind(clip: any): "midi" | "audio" | "?" { if (Array.isArray(clip?.notes)) return "midi"; if (clip?.filePath) return "audio"; return "?"; }

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"preview", description:"Preview the Session→Arrangement layout: per-scene clip counts and where each scene would land", category:"arrangement", parameters:{ scene_length:{type:"number",description:"Force a fixed scene length in beats (omit = longest clip per scene)",required:false}, gap_beats:{type:"number",description:"Gap between scenes in beats (default 0)",required:false} } },
    async (args: any, song: any) => {
      const tracks = song?.tracks || [];
      const scenes = sceneCount(tracks);
      if (!scenes) return { success:false, error:"No Session clips found." };
      let cursor = 0; const layout = []; let totalClips = 0;
      for (let s = 0; s < scenes; s++) {
        const clips = tracks.map((t: any) => t.clipSlots?.[s]?.clip).filter(Boolean);
        if (!clips.length) continue;
        const len = args.scene_length || Math.max(...clips.map(clipLen));
        layout.push({ scene: s, startBeat: cursor, length: len, clips: clips.length, midi: clips.filter((c: any) => kind(c) === "midi").length, audio: clips.filter((c: any) => kind(c) === "audio").length });
        totalClips += clips.length; cursor += len + (args.gap_beats || 0);
      }
      return { success:true, data:{ scenes: layout.length, totalClips, totalBeats: cursor, layout } };
    }
  );

  reg.register({ name:"flatten", description:"Copy every Session clip onto the Arrangement timeline, scene by scene (MIDI + audio)", category:"arrangement", parameters:{ scene_length:{type:"number",description:"Force a fixed scene length in beats (omit = longest clip per scene)",required:false}, gap_beats:{type:"number",description:"Gap between scenes in beats (default 0)",required:false} } },
    async (args: any, song: any) => {
      const tracks = song?.tracks || [];
      const scenes = sceneCount(tracks);
      if (!scenes) return { success:false, error:"No Session clips found." };
      let cursor = 0, clipsCopied = 0, scenesUsed = 0, skipped = 0;
      for (let s = 0; s < scenes; s++) {
        const inScene: { track: any; clip: any }[] = [];
        let sceneLen = 0;
        for (const t of tracks) { const c = t.clipSlots?.[s]?.clip; if (c) { inScene.push({ track: t, clip: c }); sceneLen = Math.max(sceneLen, clipLen(c)); } }
        if (!inScene.length) continue;
        if (args.scene_length) sceneLen = args.scene_length;
        for (const { track, clip } of inScene) {
          try {
            if (kind(clip) === "midi" && typeof track.createMidiClip === "function") {
              const ac = await track.createMidiClip(cursor, clipLen(clip));
              ac.notes = (clip.notes || []).map((n: any) => ({ ...n }));
              if (clip.name) ac.name = clip.name;
              clipsCopied++;
            } else if (kind(clip) === "audio" && typeof track.createAudioClip === "function") {
              await track.createAudioClip({ filePath: clip.filePath, startTime: cursor, duration: clipLen(clip), isWarped: !!clip.warping });
              clipsCopied++;
            } else { skipped++; }
          } catch { skipped++; }
        }
        cursor += sceneLen + (args.gap_beats || 0); scenesUsed++;
      }
      if (!clipsCopied) return { success:false, error:"Nothing copied (no compatible Session clips)." };
      return { success:true, data:{ scenesProcessed: scenesUsed, clipsCopied, skipped, totalBeats: cursor } };
    }
  );


  reg.register({ name:"flatten_scene", description:"Copy ONE scene's Session clips onto the Arrangement at a chosen beat (default: after the last arrangement clip) — MIDI notes + audio from file", category:"arrangement", parameters:{ scene_index:{type:"number",description:"Scene row to copy",required:true}, at_beat:{type:"number",description:"Arrangement position in beats (omit = append after existing clips)",required:false} } },
    async (args: any, song: any) => {
      const tracks = song?.tracks || [];
      const s = args.scene_index;
      const inScene: { track: any; clip: any }[] = [];
      let sceneLen = 0;
      for (const t of tracks) { const c = t.clipSlots?.[s]?.clip; if (c) { inScene.push({ track: t, clip: c }); sceneLen = Math.max(sceneLen, clipLen(c)); } }
      if (!inScene.length) return { success:false, error:"That scene has no clips." };
      let cursor = args.at_beat;
      if (typeof cursor !== "number") {
        cursor = 0;
        for (const t of tracks) for (const c of (t.arrangementClips || [])) cursor = Math.max(cursor, (c.startTime || 0) + clipLen(c));
      }
      let clipsCopied = 0, skipped = 0;
      for (const { track, clip } of inScene) {
        try {
          if (kind(clip) === "midi" && typeof track.createMidiClip === "function") {
            const ac = await track.createMidiClip(cursor, clipLen(clip));
            ac.notes = (clip.notes || []).map((n: any) => ({ ...n }));
            if (clip.name) ac.name = clip.name;
            clipsCopied++;
          } else if (kind(clip) === "audio" && typeof track.createAudioClip === "function") {
            await track.createAudioClip({ filePath: clip.filePath, startTime: cursor, duration: clipLen(clip), isWarped: !!clip.warping });
            clipsCopied++;
          } else skipped++;
        } catch { skipped++; }
      }
      if (!clipsCopied) return { success:false, error:"Nothing copied (no compatible clips in that scene)." };
      return { success:true, data:{ scene:s, atBeat:cursor, sceneLength:sceneLen, clipsCopied, skipped } };
    }
  );

  return reg;
}
