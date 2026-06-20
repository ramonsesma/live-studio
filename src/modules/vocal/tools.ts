// Módulo: Vocal Chain & FX — reutilizado de examples/vocal-processor
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

  reg.register({ name:"setup_chain", description:"Set up full vocal processing chain on a track", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, chain_type:{type:"string",description:"Vocal chain preset",required:false,enum:["lead","backing","rap","podcast","vocal_fx","harmony"]}, add_compressor:{type:"boolean",description:"Add compressor",required:false}, add_eq:{type:"boolean",description:"Add EQ",required:false}, add_deesser:{type:"boolean",description:"Add de-esser",required:false}, add_reverb:{type:"boolean",description:"Add reverb send",required:false}, add_delay:{type:"boolean",description:"Add delay send",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      const chain: string[] = [];
      if (args.add_eq !== false) chain.push("EQ Eight");
      if (args.add_deesser !== false) chain.push("De-esser (Dynamic Tube)");
      if (args.add_compressor !== false) chain.push("Compressor");
      if (args.add_reverb !== false) chain.push("Reverb (Send)");
      if (args.add_delay !== false) chain.push("Delay (Send)");
      return { success:true, data:{ chainSet:true, trackName:track?.name||"Unknown", chainType:args.chain_type||"lead", devicesAdded:chain, deviceCount:chain.length } };
    }
  );

  reg.register({ name:"set_deesser", description:"Set de-esser parameters", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, frequency:{type:"number",description:"De-ess frequency Hz (2000-10000)",required:false}, amount:{type:"number",description:"Reduction amount 0-100%",required:false}, mode:{type:"string",description:"Processing mode",required:false,enum:["broadband","split"]} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ deesserSet:true, trackName:track?.name||"Unknown", freq:args.frequency||7500, amount:args.amount||50, mode:args.mode||"broadband" } };
    }
  );

  reg.register({ name:"set_vocal_eq", description:"Set vocal EQ bands", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, hp_filter:{type:"number",description:"High-pass filter Hz",required:false}, low_mid:{type:"number",description:"Low-mid cut/boost dB",required:false}, presence:{type:"number",description:"Presence boost dB",required:false}, air:{type:"number",description:"Air band boost dB",required:false}, de_ess_freq:{type:"number",description:"De-ess frequency Hz",required:false} } },
    async (args: any) => ({ success:true, data:{ eqSet:true, hp:args.hp_filter||80, lowMid:args.low_mid||-2, presence:args.presence||2, air:args.air||1.5, deEssFreq:args.de_ess_freq||7500 } })
  );

  reg.register({ name:"set_vocal_comp", description:"Set vocal compressor settings", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, threshold:{type:"number",description:"Threshold dB (-40 to 0)",required:false}, ratio:{type:"number",description:"Ratio 1-20",required:false}, attack:{type:"number",description:"Attack ms (0.01-30)",required:false}, release:{type:"number",description:"Release ms (5-500)",required:false}, knee:{type:"number",description:"Knee dB",required:false}, makeup:{type:"number",description:"Makeup gain dB",required:false} } },
    async (args: any) => ({ success:true, data:{ compSet:true, threshold:args.threshold||-18, ratio:args.ratio||3, attack:args.attack||1, release:args.release||80, knee:args.knee||3, makeup:args.makeup||4 } })
  );

  reg.register({ name:"add_vocal_fx", description:"Add creative FX to vocal track", category:"vocal", parameters:{ track_index:{type:"number",description:"Track index",required:true}, fx_type:{type:"string",description:"FX type",required:true,enum:["reverb","delay","chorus","doubler","harmonizer","pitch","formant","vocoder","saturation","distortion","tremolo","auto_pan"]}, preset:{type:"string",description:"FX preset name",required:false}, wet_dry:{type:"number",description:"Wet/dry mix 0-100%",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ fxAdded:true, trackName:track?.name||"Unknown", fxType:args.fx_type, preset:args.preset||"Default", wetDry:args.wet_dry||30 } };
    }
  );

  return reg;
}
