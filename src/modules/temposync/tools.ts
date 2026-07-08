// Módulo: Tempo & Grid Sync — reutilizado de examples/tempo-grid-synchronizer
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

  reg.register({ name:"get_tempo_info", description:"Get current tempo and grid info", category:"tempo", parameters:{} },
    async (_a: any, song: any) => ({ success:true, data:{ tempo:song.tempo, timeSignature:(song.scenes&&song.scenes[0]?(((song.scenes[0].signatureNumerator)||4)+"/"+((song.scenes[0].signatureDenominator)||4)):"4/4"), gridQuantization:song.gridQuantization, gridIsTriplet:song.gridIsTriplet } })
  );

  reg.register({ name:"set_tempo", description:"Set master tempo", category:"tempo", parameters:{ bpm:{type:"number",description:"BPM 20-999",required:true}, smooth:{type:"boolean",description:"Smooth transition",required:false} } },
    async (args: any, song: any) => { song.tempo = args.bpm; return { success:true, data:{ tempo:song.tempo } }; }
  );

  // sync_tracks_to_tempo was removed here: it set song.tempo (duplicating set_tempo) and then
  // FABRICATED per-track "synced: true" results — no per-track sync operation exists in the
  // SDK (warp/tempo-follow isn't writable), so there was nothing real behind the claim.

  
  
  
  return reg;
}
