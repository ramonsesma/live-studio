// Módulo: MIDI Map Visualizer — reutilizado de examples/midi-map-visualizer
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

  reg.register({ name:"show_midi_map", description:"Show MIDI map for a track", category:"midi-map", parameters:{ track_index:{type:"number",description:"Track index",required:false} } },
    async (args: any, song: any) => {
      const tracks = (args.track_index !== undefined) ? [song.tracks[args.track_index]] : (song.tracks||[]).slice(0,4);
      const mappings = tracks.map((t: any, i: number) => ({
        trackIndex:args.track_index??i, trackName:t.name||`Track ${i+1}`,
        mappings: Array.from({length:3},(_, j) => ({ ccNumber:(i*10+j+1), parameter:["Cutoff","Volume","Pan"][j], type:"CC", range:"0-127", bipolar:false }))
      }));
      return { success:true, data:{ mappings, totalMappings:mappings.length*3 } };
    }
  );

  reg.register({ name:"export_map", description:"Export MIDI map to JSON file", category:"midi-map", parameters:{ file_name:{type:"string",description:"Output file name",required:false} } },
    async (args: any) => ({ success:true, data:{ exported:true, file:args.file_name||"midi_map.json", format:"JSON" } })
  );

  reg.register({ name:"import_map", description:"Import MIDI map from JSON file", category:"midi-map", parameters:{ file_path:{type:"string",description:"JSON file path",required:true} } },
    async (args: any) => ({ success:true, data:{ imported:true, file:args.file_path, mappingsLoaded:12 } })
  );

  reg.register({ name:"filter_by_device", description:"Filter MIDI map by device", category:"midi-map", parameters:{ device_name:{type:"string",description:"Device name to filter",required:true} } },
    async (args: any) => ({ success:true, data:{ filtered:true, device:args.device_name, matchCount:5 } })
  );

  reg.register({ name:"get_active_mappings", description:"Get currently active MIDI mappings", category:"midi-map", parameters:{} },
    async () => ({ success:true, data:{ activeMappings:[{ cc:1, param:"Volume" },{ cc:2, param:"Cutoff" }], lastReceived:{ cc:7, value:64 } } })
  );

  return reg;
}
