// Módulo: Generative Arranger — apply_arrangement drops real cue points. create_variation now
// really mutates the MIDI clips inside a section's time span (found via cue points). Live has no
// arrangement-automation write API, so set_energy_curve — which implies writing a volume envelope
// over time — is honestly advisory.
import { recordNotes } from "../../core/history.js";
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

// Named bar-length structures per `sections` arg — this is what actually varies the plan,
// since we have no way to know real instrumentation from a style name alone.
const STRUCTURES: Record<string, { name: string; bars: number }[]> = {
  "intro-verse-chorus": [{ name:"Intro", bars:8 }, { name:"Verse 1", bars:16 }, { name:"Chorus", bars:16 }, { name:"Verse 2", bars:16 }, { name:"Chorus 2", bars:16 }, { name:"Bridge", bars:8 }, { name:"Chorus 3", bars:16 }, { name:"Outro", bars:8 }],
  "verse-chorus-bridge": [{ name:"Verse 1", bars:16 }, { name:"Chorus", bars:16 }, { name:"Verse 2", bars:16 }, { name:"Chorus 2", bars:16 }, { name:"Bridge", bars:8 }, { name:"Chorus 3", bars:16 }],
  "ambient-flow": [{ name:"Intro", bars:16 }, { name:"Flow A", bars:32 }, { name:"Flow B", bars:32 }, { name:"Flow C", bars:32 }, { name:"Outro", bars:16 }],
};
// Energy shapes actually change the per-section energy value, not just decorate it.
function energyAt(curve: string, i: number, n: number): number {
  const t = n > 1 ? i / (n - 1) : 0;
  if (curve === "build") return Number((0.15 + t * 0.85).toFixed(2));
  if (curve === "flat") return 0.6;
  if (curve === "wave") return Number((0.5 + 0.4 * Math.sin(t * Math.PI * 2)).toFixed(2));
  // "arc" (default): rises to a peak around 2/3 through, then falls
  const peak = 0.66;
  const arc = t < peak ? t / peak : 1 - (t - peak) / (1 - peak);
  return Number((0.15 + arc * 0.85).toFixed(2));
}

export function createToolRegistry() {
  const reg = new ToolRegistry();
  // The last generated plan — apply_arrangement uses it if present, so generate_arrangement's
  // args actually reach the timeline instead of apply_arrangement using its own fixed template.
  let lastPlan: { name: string; bars: number; energy: number }[] | null = null;

  reg.register({ name:"generate_arrangement", description:"Generate a real arrangement plan (section names/bars/energy) that respects style/sections/energy_curve — apply_arrangement then drops THIS plan onto the timeline", category:"arranger", parameters:{ style:{type:"string",description:"Genre style (label only — track instrumentation isn't known here)",required:false,enum:["electronic","pop","hiphop","ambient","techno","house"]}, energy_curve:{type:"string",description:"Energy shape",required:false,enum:["arc","wave","build","flat"]}, sections:{type:"string",description:"Section structure",required:false,enum:["intro-verse-chorus","verse-chorus-bridge","ambient-flow"]} } },
    async (args: any) => {
      const structureName = args.sections || "intro-verse-chorus";
      const structure = STRUCTURES[structureName] || STRUCTURES["intro-verse-chorus"];
      const curve = args.energy_curve || "arc";
      const sections = structure.map((s, i) => ({ name:s.name, bars:s.bars, energy: energyAt(curve, i, structure.length) }));
      lastPlan = sections;
      const totalBars = sections.reduce((a, s) => a + s.bars, 0);
      return { success:true, data:{ generated:true, style:args.style||"electronic", sectionStructure:structureName, energyCurve:curve, sections, totalBars } };
    }
  );

  reg.register({ name:"apply_arrangement", description:"Drop the last generated arrangement (or the default template, if none was generated yet) onto the timeline as named section locators (cue points)", category:"arranger", parameters:{ overwrite:{type:"boolean",description:"Clear existing locators first",required:false} } },
    async (args: any, song: any) => {
      if (!song?.createCuePoint) return { success:false, error:"Cue points are only available inside Live." };
      const plan = lastPlan || STRUCTURES["intro-verse-chorus"].map((s, i, arr) => ({ name:s.name, bars:s.bars, energy: energyAt("arc", i, arr.length) }));
      if (args.overwrite) { for (const c of [...(song.cuePoints || [])]) { try { await song.deleteCuePoint(c); } catch {} } }
      let bar = 0; const markers: any[] = [];
      for (const s of plan) { try { const cue = await song.createCuePoint(bar * 4); if (cue && "name" in cue) { try { cue.name = s.name; } catch {} } markers.push({ name:s.name, bar, energy:s.energy }); } catch {} bar += s.bars; }
      return { success:true, data:{ applied:true, usedGeneratedPlan: !!lastPlan, sections: markers.length, totalBars: bar, markers } };
    }
  );

  reg.register({ name:"create_variation", description:"Mutate the real MIDI clips inside a named section (found via its cue point span) — strip/dense/rhythmic/melodic (undoable)", category:"arranger", parameters:{ section_name:{type:"string",description:"Section to vary (matches a cue point name)",required:true}, variation_type:{type:"string",description:"Variation type",required:false,enum:["strip","dense","melodic","rhythmic"]} } },
    async (args: any, song: any) => {
      const cues = (song.cuePoints || []).slice().sort((a: any, b: any) => a.time - b.time);
      const idx = cues.findIndex((c: any) => (c.name || "").toLowerCase() === String(args.section_name).toLowerCase());
      if (idx === -1) return { success:false, error:`No cue point named "${args.section_name}" — use sections__get_sections to see them.` };
      const start = cues[idx].time, end = idx + 1 < cues.length ? cues[idx + 1].time : Infinity;
      const type = args.variation_type || "strip";
      const modified: any[] = [];
      (song.tracks || []).forEach((t: any, ti: number) => {
        (t.arrangementClips || []).forEach((clip: any, ci: number) => {
          if (!Array.isArray(clip.notes) || clip.startTime < start || clip.startTime >= end) return;
          const notes = clip.notes.map((n: any) => ({ ...n }));
          let out = notes;
          if (type === "strip") { const med = notes.map((n: any) => n.velocity).sort((a: number,b: number)=>a-b)[Math.floor(notes.length/2)] || 64; out = notes.filter((n: any) => n.velocity >= med); }
          else if (type === "dense") { out = notes.concat(notes.map((n: any) => ({ ...n, pitch: n.pitch + 12, velocity: Math.round(n.velocity * 0.7) }))); }
          else if (type === "rhythmic") { out = notes.filter((n: any) => Math.abs(n.startTime - Math.round(n.startTime)) < 0.01); }
          else if (type === "melodic") { out = notes.concat(notes.map((n: any) => ({ ...n, pitch: n.pitch + 7, velocity: Math.round(n.velocity * 0.8) }))); }
          recordNotes(clip, ti, ci, "genarranger.create_variation");
          clip.notes = out;
          modified.push({ trackIndex:ti, clipIndex:ci, clipName:clip.name, noteCountBefore:notes.length, noteCountAfter:out.length });
        });
      });
      if (!modified.length) return { success:false, error:`No MIDI clips found inside "${args.section_name}".` };
      return { success:true, data:{ variationCreated:true, section:args.section_name, type, clipsModified:modified.length, modified } };
    }
  );

  reg.register({ name:"set_energy_curve", description:"Redraw energy curve for arrangement (advisory — the SDK has no arrangement-automation write API to draw a volume envelope over time)", category:"arranger", parameters:{ points:{type:"string",description:"Comma-separated energy values 0-1",required:true} } },
    async (args: any) => {
      const pts = String(args.points).split(",").map(Number);
      return { success:true, data:{ advisory:true, note:"The SDK can only set a track's overall volume, not draw a time-varying automation envelope — this can't be applied. Automate volume by hand in Live's Arrangement view.", pointCount:pts.length, min:Math.min(...pts), max:Math.max(...pts) } };
    }
  );

  
  return reg;
}
