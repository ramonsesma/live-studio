// Módulo: Arreglo & Navegación — arrangement markers (cue points / locators), now with
// genre song-structure templates dropped as named locators, plus full locator management.
// Uses the SDK's real song.createCuePoint / deleteCuePoint / cuePoint.name.
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

// Curated song-structure templates (our own). Each section = [name, bars]; the bar lengths
// accumulate into a locator position. Time in beats = startBar * 4 (4/4).
const CUE_TEMPLATES: Record<string, { label: string; sections: [string, number][] }> = {
  edm:     { label: "EDM",              sections: [["Intro",16],["Build",8],["Drop",16],["Breakdown",16],["Build 2",8],["Drop 2",16],["Outro",16]] },
  hiphop:  { label: "Hip-Hop",          sections: [["Intro",4],["Verse 1",16],["Hook",8],["Verse 2",16],["Hook 2",8],["Bridge",8],["Hook 3",8],["Outro",4]] },
  poprock: { label: "Pop/Rock",         sections: [["Intro",4],["Verse 1",8],["Pre",4],["Chorus",8],["Verse 2",8],["Pre 2",4],["Chorus 2",8],["Bridge",8],["Chorus 3",8],["Outro",4]] },
  ambient: { label: "Ambient/Cinematic",sections: [["Intro",16],["Swell",16],["Theme",32],["Shift",16],["Climax",16],["Resolve",16]] },
  funk:    { label: "Funk/Soul",        sections: [["Intro",8],["Groove",16],["Verse",16],["Chorus",8],["Break",8],["Verse 2",16],["Chorus 2",8],["Outro",8]] },
  breaks:  { label: "Breaks/Bass",      sections: [["Intro",16],["Drop",32],["Switch",16],["Drop 2",32],["Outro",16]] },
};

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"list_cue_templates", description:"List the genre song-structure templates (sections + bars)", category:"navigation", parameters:{} },
    async () => ({ success:true, data:{ templates: Object.entries(CUE_TEMPLATES).map(([id, t]) => ({ id, label: t.label, sectionCount: t.sections.length, totalBars: t.sections.reduce((a, s) => a + s[1], 0), sections: t.sections.map((s) => ({ name: s[0], bars: s[1] })) })) } })
  );

  reg.register({ name:"apply_cue_template", description:"Drop a genre song-structure template into the arrangement as named locators (cue points), optionally setting tempo", category:"navigation", parameters:{ genre:{type:"string",description:"Template genre",required:true,enum:Object.keys(CUE_TEMPLATES)}, bars_scale:{type:"number",description:"Scale all section lengths (0.25-4, default 1)",required:false}, set_tempo:{type:"number",description:"Optionally set the song tempo (BPM)",required:false}, clear_first:{type:"boolean",description:"Wipe existing locators before applying (default false)",required:false} } },
    async (args: any, song: any) => {
      const tpl = CUE_TEMPLATES[args.genre]; if (!tpl) return { success:false, error:"Unknown template." };
      if (!song.createCuePoint) return { success:false, error:"Cue points are only available inside Live." };
      if (typeof args.set_tempo === "number" && "tempo" in song) { try { song.tempo = Math.max(20, Math.min(300, args.set_tempo)); } catch {} }
      if (args.clear_first) { for (const c of [...(song.cuePoints || [])]) { try { await song.deleteCuePoint(c); } catch {} } }
      const scale = Math.max(0.25, Math.min(4, args.bars_scale || 1));
      let bar = 0; const added: any[] = [];
      for (const [name, bars] of tpl.sections) {
        const time = bar * 4;
        try { const cue = await song.createCuePoint(time); if (cue && "name" in cue) { try { cue.name = name; } catch {} } added.push({ name, bar, time }); }
        catch {}
        bar += Math.max(1, Math.round(bars * scale));
      }
      return { success:true, data:{ genre: tpl.label, sections: added.length, totalBars: bar, tempo: typeof args.set_tempo === "number" ? args.set_tempo : null, markers: added } };
    }
  );

  reg.register({ name:"clear_markers", description:"Delete ALL arrangement markers (cue points / locators)", category:"navigation", parameters:{} },
    async (_args: any, song: any) => {
      const cues = [...(song.cuePoints || [])];
      let removed = 0;
      for (const c of cues) { try { await song.deleteCuePoint(c); removed++; } catch {} }
      return { success:true, data:{ removed, remaining:(song.cuePoints || []).length } };
    }
  );

  reg.register({ name:"delete_marker", description:"Delete a single arrangement marker by index (sorted by time) or name", category:"navigation", parameters:{ index:{type:"number",description:"Marker index (0-based, sorted by time)",required:false}, name:{type:"string",description:"Marker name (if no index)",required:false} } },
    async (args: any, song: any) => {
      const cues = (song.cuePoints || []).slice().sort((a: any, b: any) => a.time - b.time);
      const target = args.index != null ? cues[args.index] : (args.name ? cues.find((c: any) => c.name === args.name) : null);
      if (!target) return { success:false, error:"Marker not found." };
      try { await song.deleteCuePoint(target); } catch { return { success:false, error:"Could not delete marker." }; }
      return { success:true, data:{ deleted:true, name:target.name, remaining:(song.cuePoints || []).length } };
    }
  );

  reg.register({ name:"rename_marker", description:"Rename an arrangement marker by index (sorted by time)", category:"navigation", parameters:{ index:{type:"number",description:"Marker index (0-based, sorted by time)",required:true}, name:{type:"string",description:"New name",required:true} } },
    async (args: any, song: any) => {
      const cues = (song.cuePoints || []).slice().sort((a: any, b: any) => a.time - b.time);
      const target = cues[args.index];
      if (!target || !("name" in target)) return { success:false, error:"Marker not found." };
      try { target.name = args.name; } catch { return { success:false, error:"Could not rename marker." }; }
      return { success:true, data:{ renamed:true, index:args.index, name:args.name, time:target.time } };
    }
  );

  reg.register({ name:"get_markers", description:"List all arrangement markers", category:"navigation", parameters:{} },
    async (_args: any, song: any) => {
      // Arrangement markers are the Set's cue points (locators).
      const cues = (song.cuePoints || []).slice().sort((a: any, b: any) => a.time - b.time);
      return { success:true, data:{ markerCount:cues.length, markers:cues.map((c: any, i: number) => ({ index:i, name:c.name, time:c.time })) } };
    }
  );

  
  reg.register({ name:"add_marker", description:"Add an arrangement marker (cue point) at a time position", category:"navigation", parameters:{ name:{type:"string",description:"Marker name",required:true}, time:{type:"number",description:"Time in beats (default 0)",required:false} } },
    async (args: any, song: any) => {
      if (!song.createCuePoint) return { success:false, error:"Cue points unavailable" };
      const cue = await song.createCuePoint(args.time ?? 0);
      if (args.name && "name" in cue) { try { cue.name = args.name; } catch {} }
      return { success:true, data:{ added:true, name:args.name, time:args.time ?? 0, markerCount:(song.cuePoints||[]).length } };
    }
  );

  
  
  return reg;
}
