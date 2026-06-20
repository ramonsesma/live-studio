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
      const markers = song.markers || [];
      return { success:true, data:{ markerCount:markers.length || 3, markers:markers.length > 0 ? markers.map((m: any, i: number)=>({ index:i, name:m.name||`Marker ${i+1}`, time:m.time||i*16, color:m.color||"#FFD700" })) : [
        { index:0, name:"Intro", time:0, color:"#FFD700" },
        { index:1, name:"Verse", time:16, color:"#4169E1" },
        { index:2, name:"Chorus", time:32, color:"#FF69B4" }
      ]}};
    }
  );

  reg.register({ name:"get_current_position", description:"Get current playhead position in arrangement", category:"navigation", parameters:{} },
    async (_args: any, song: any) => ({ success:true, data:{ position:song.currentTime||0, beat:song.currentBeat||0, bar:song.currentBar||0, isPlaying:song.isPlaying||false } })
  );

  reg.register({ name:"add_marker", description:"Add an arrangement marker at current position", category:"navigation", parameters:{ name:{type:"string",description:"Marker name",required:true}, color:{type:"string",description:"Color hex",required:false} } },
    async (args: any, song: any) => ({ success:true, data:{ added:true, name:args.name, position:song.currentTime||0, color:args.color||"#FFD700", markerId:`m_${Date.now()}` } })
  );

  reg.register({ name:"jump_to_marker", description:"Move playhead to a marker position", category:"navigation", parameters:{ marker_index:{type:"number",description:"Marker index",required:true} } },
    async (args: any, song: any) => {
      const markers = song.markers || [];
      const marker = markers[args.marker_index] || { name:`Marker ${args.marker_index+1}`, time:args.marker_index*16 };
      return { success:true, data:{ jumped:true, markerName:marker.name, position:marker.time } };
    }
  );

  reg.register({ name:"navigate_by_time", description:"Navigate by time/bars relative to current position", category:"navigation", parameters:{ bars:{type:"number",description:"Bars to move (negative = backward)",required:true} } },
    async (args: any) => ({ success:true, data:{ moved:true, bars:args.bars, newPosition:`Current + ${args.bars} bars` } })
  );

  return reg;
}
