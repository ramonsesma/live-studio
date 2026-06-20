// Módulo: Looper Controller — reutilizado de examples/looper-controller
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

  reg.register({ name:"start_loop", description:"Start loop recording on a track", category:"looper", parameters:{ track_index:{type:"number",description:"Track index",required:true}, length:{type:"number",description:"Loop length in bars",required:false,enum:[1,2,4,8,16]}, quantize:{type:"boolean",description:"Quantize loop start/end",required:false} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ started:true, trackIndex:args.track_index, trackName:track?.name||"Unknown", length:args.length||4, quantize:args.quantize!==false, status:"recording" } };
    }
  );

  reg.register({ name:"overdub", description:"Overdub a new layer onto the current loop", category:"looper", parameters:{ track_index:{type:"number",description:"Track index",required:true}, mode:{type:"string",description:"Overdub mode",required:false,enum:["add","replace","multiply"]} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ overdubbed:true, mode:args.mode||"add", trackName:track?.name||"Unknown", layersCount:Math.floor(Math.random()*3)+2 } };
    }
  );

  reg.register({ name:"multiply_loop", description:"Multiply (duplicate and layer) the current loop", category:"looper", parameters:{ track_index:{type:"number",description:"Track index",required:true}, times:{type:"number",description:"Number of multiplications",required:false} } },
    async (args: any) => ({ success:true, data:{ multiplied:true, times:args.times||2, newLength:(args.times||2)*4, layers:Math.floor(Math.random()*3)+1 } })
  );

  reg.register({ name:"undo_layer", description:"Undo the last loop recording layer", category:"looper", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async () => ({ success:true, data:{ undone:true, previousLayers:3, remainingLayers:2 } })
  );

  reg.register({ name:"set_loop_length", description:"Change current loop length", category:"looper", parameters:{ track_index:{type:"number",description:"Track index",required:true}, bars:{type:"number",description:"New loop length in bars",required:true,enum:[1,2,4,8,16,32]} } },
    async (args: any) => ({ success:true, data:{ lengthChanged:true, newLength:args.bars, timeStretched:true } })
  );

  reg.register({ name:"toggle_play", description:"Toggle loop playback for a track", category:"looper", parameters:{ track_index:{type:"number",description:"Track index",required:true} } },
    async (args: any) => {
      const isPlaying = Math.random() > 0.5;
      return { success:true, data:{ trackIndex:args.track_index, wasPlaying:isPlaying, nowPlaying:!isPlaying } };
    }
  );

  return reg;
}
