// Módulo: Secciones de Arreglo — real arrangement markers via Song.cuePoints/createCuePoint/deleteCuePoint.
// Live has no per-marker color/tempo/duration concept, and no API to duplicate the clips between
// two markers — those extras are echoed back but marked advisory rather than pretended as applied.
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

const sortedCues = (song: any) => (song.cuePoints || []).slice().sort((a: any, b: any) => a.time - b.time);

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_sections", description:"List real arrangement sections from Live's cue points", category:"sections", parameters:{} },
    async (_a: any, song: any) => {
      const cues = sortedCues(song);
      const sections = cues.map((c: any, i: number) => {
        const next = cues[i + 1];
        return { index:i, name:c.name || `Section ${i + 1}`, startTime:c.time, endTime: next ? next.time : null, duration: next ? next.time - c.time : null };
      });
      return { success:true, data:{ sectionCount:sections.length, sections } };
    }
  );

  reg.register({ name:"create_section", description:"Create a real cue point marking a section start (color/duration/tempo are not stored by Live markers — advisory only)", category:"sections", parameters:{ name:{type:"string",description:"Section name",required:true}, start_bar:{type:"number",description:"Start bar position (assumes 4/4)",required:true}, duration:{type:"number",description:"Duration in bars (advisory)",required:false}, color:{type:"string",description:"Section color hex (advisory)",required:false}, tempo:{type:"number",description:"Section tempo (advisory)",required:false} } },
    async (args: any, song: any) => {
      const beats = (args.start_bar - 1) * 4;
      const cue = await song.createCuePoint(Math.max(0, beats));
      cue.name = args.name;
      const extras = (args.duration || args.color || args.tempo) ? { advisory:true, note:"Live cue points have no color/duration/tempo — only a name and position were actually created.", requestedDuration:args.duration, requestedColor:args.color, requestedTempo:args.tempo } : {};
      return { success:true, data:{ created:true, name:cue.name, startBeats:cue.time, startBar:args.start_bar, ...extras } };
    }
  );

  reg.register({ name:"duplicate_section", description:"Duplicate a section's marker(s) further down the arrangement (advisory — the clips between markers are NOT copied, only the marker itself)", category:"sections", parameters:{ section_index:{type:"number",description:"Section index to duplicate",required:true}, times:{type:"number",description:"Number of copies",required:false} } },
    async (args: any, song: any) => {
      const cues = sortedCues(song);
      const src = cues[args.section_index];
      if (!src) return { success:false, error:`Section ${args.section_index} not found` };
      const next = cues[args.section_index + 1];
      const span = next ? next.time - src.time : 16;
      const copies = args.times || 1;
      const lastTime = cues.length ? cues[cues.length - 1].time : 0;
      const created: any[] = [];
      for (let i = 0; i < copies; i++) {
        const time = lastTime + span * (i + 1);
        const cue = await song.createCuePoint(time);
        cue.name = `${src.name || "Section"} copy${copies > 1 ? " " + (i + 1) : ""}`;
        created.push({ name:cue.name, startBeats:cue.time });
      }
      return { success:true, data:{ advisory:true, note:"Only marker(s) were duplicated — Live's API has no way to copy the clips of an arrangement span between tracks.", sourceIndex:args.section_index, created } };
    }
  );

  reg.register({ name:"delete_section", description:"Delete a section's real cue point (ripple-deleting clip content is not supported by the SDK — advisory)", category:"sections", parameters:{ section_index:{type:"number",description:"Section index to delete",required:true}, ripple:{type:"boolean",description:"Ripple delete (advisory — content isn't moved)",required:false} } },
    async (args: any, song: any) => {
      const cues = sortedCues(song);
      const cue = cues[args.section_index];
      if (!cue) return { success:false, error:`Section ${args.section_index} not found` };
      const name = cue.name;
      await song.deleteCuePoint(cue);
      const extra = args.ripple ? { advisory:true, note:"Marker deleted, but ripple-shifting arrangement clips isn't supported by the SDK." } : {};
      return { success:true, data:{ deleted:true, sectionIndex:args.section_index, name, ...extra } };
    }
  );

  return reg;
}
