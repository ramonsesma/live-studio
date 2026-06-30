// Módulo: Generative Arranger — reutilizado de examples/generative-arranger
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

  reg.register({ name:"generate_arrangement", description:"Generate full song arrangement from clips", category:"arranger", parameters:{ style:{type:"string",description:"Genre style",required:false,enum:["electronic","pop","hiphop","ambient","techno","house"]}, energy_curve:{type:"string",description:"Energy shape",required:false,enum:["arc","wave","build","flat"]}, sections:{type:"string",description:"Section structure",required:false,enum:["intro-verse-chorus","verse-chorus-bridge","ambient-flow"]} } },
    async (args: any) => {
      const sections = [
        { name:"Intro", bars:8, energy:0.2, tracks:[0,1] },
        { name:"Verse 1", bars:16, energy:0.4, tracks:[0,1,2] },
        { name:"Chorus", bars:16, energy:0.9, tracks:[0,1,2,3] },
        { name:"Verse 2", bars:16, energy:0.5, tracks:[0,1,2] },
        { name:"Chorus", bars:16, energy:1.0, tracks:[0,1,2,3] },
        { name:"Bridge", bars:8, energy:0.3, tracks:[0,3] },
        { name:"Chorus", bars:16, energy:1.0, tracks:[0,1,2,3] },
        { name:"Outro", bars:8, energy:0.1, tracks:[0] }
      ];
      return { success:true, data:{ generated:true, style:args.style||"electronic", sections, totalBars:96 } };
    }
  );

  reg.register({ name:"apply_arrangement", description:"Drop the generated arrangement onto the timeline as named section locators (cue points)", category:"arranger", parameters:{ overwrite:{type:"boolean",description:"Clear existing locators first",required:false} } },
    async (args: any, song: any) => {
      if (!song?.createCuePoint) return { success:false, error:"Cue points are only available inside Live." };
      const sections = [["Intro",8],["Verse 1",16],["Chorus",16],["Verse 2",16],["Chorus 2",16],["Bridge",8],["Chorus 3",16],["Outro",8]] as [string, number][];
      if (args.overwrite) { for (const c of [...(song.cuePoints || [])]) { try { await song.deleteCuePoint(c); } catch {} } }
      let bar = 0; const markers: any[] = [];
      for (const [name, bars] of sections) { try { const cue = await song.createCuePoint(bar * 4); if (cue && "name" in cue) { try { cue.name = name; } catch {} } markers.push({ name, bar }); } catch {} bar += bars; }
      return { success:true, data:{ applied:true, sections: markers.length, totalBars: bar, markers } };
    }
  );

  reg.register({ name:"create_variation", description:"Create variation of existing section", category:"arranger", parameters:{ section_name:{type:"string",description:"Section to vary",required:true}, variation_type:{type:"string",description:"Variation type",required:false,enum:["strip","dense","melodic","rhythmic"]} } },
    async (args: any) => ({ success:true, data:{ variationCreated:true, section:args.section_name, type:args.variation_type||"strip" } })
  );

  reg.register({ name:"set_energy_curve", description:"Redraw energy curve for arrangement", category:"arranger", parameters:{ points:{type:"string",description:"Comma-separated energy values 0-1",required:true} } },
    async (args: any) => {
      const pts = String(args.points).split(",").map(Number);
      return { success:true, data:{ curveSet:true, pointCount:pts.length, min:Math.min(...pts), max:Math.max(...pts) } };
    }
  );

  
  return reg;
}
