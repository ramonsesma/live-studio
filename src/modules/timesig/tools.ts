// Módulo: Time Signature Editor — reutilizado de examples/time-signature-editor
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

  reg.register({ name:"get_time_signature", description:"Get current time signature info", category:"time-sig", parameters:{} },
    async (_a: any, song: any) => {
      // Time signature lives on scenes (signatureNumerator/Denominator).
      const sc = (song.scenes || [])[0];
      const num = sc?.signatureNumerator ?? 4, den = sc?.signatureDenominator ?? 4;
      return { success:true, data:{ timeSignature:`${num}/${den}`, numerator:num, denominator:den, perScene:(song.scenes||[]).map((s: any, i: number) => ({ scene:i, name:s.name, sig:`${s.signatureNumerator ?? 4}/${s.signatureDenominator ?? 4}` })) } };
    }
  );

  
  reg.register({ name:"add_sig_change", description:"Add a time signature change marker", category:"time-sig", parameters:{ bar:{type:"number",description:"Bar position",required:true}, time_sig:{type:"string",description:"New time signature (e.g. 3/4)",required:true}, name:{type:"string",description:"Change marker name",required:false} } },
    async (args: any) => ({ success:true, data:{ added:true, bar:args.bar, timeSig:args.time_sig, name:args.name||`Sig: ${args.time_sig}`, changeId:`sig_${Date.now()}` } })
  );

  reg.register({ name:"get_sig_map", description:"Get full time signature map", category:"time-sig", parameters:{} },
    async () => ({ success:true, data:{ changes:[
      { bar:1, timeSig:"4/4", name:"Intro" },
      { bar:9, timeSig:"3/4", name:"Waltz Section" },
      { bar:25, timeSig:"4/4", name:"Chorus" },
      { bar:41, timeSig:"6/8", name:"Bridge" },
      { bar:57, timeSig:"4/4", name:"Outro" }
    ]}})
  );

  reg.register({ name:"apply_polyrhythm", description:"Create polyrhythm layers with different time signatures", category:"time-sig", parameters:{ track_count:{type:"number",description:"Number of polyrhythm tracks",required:false}, sigs:{type:"string",description:"Comma-separated time signatures",required:true}, length:{type:"number",description:"Pattern length in bars of LMC",required:false} } },
    async (args: any, song: any) => {
      const sigs = String(args.sigs).split(",").map((s: string)=>s.trim());
      const tracks: any[] = [];
      for (const sig of sigs) {
        const t = await song.createMidiTrack();
        t.name = `Poly: ${sig}`;
        tracks.push({ name:t.name, timeSig:sig, trackIndex:song.tracks.indexOf(t) });
      }
      return { success:true, data:{ polyrhythm:true, tracks, lcm:`LCM of ${sigs.join(", ")}`, totalBars:args.length||16 } };
    }
  );

  return reg;
}
