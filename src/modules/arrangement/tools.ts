// Módulo: Arreglo & Navegación — reutilizado de examples/arrangement-navigator
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
