// Módulo: Quantize & Swing — reutilizado de examples/quick-quantizer
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

const SWING_PRESETS: any = {
  "hip-hop":{amount:65,grid:"16th",feel:"laid-back"},
  "house":{amount:40,grid:"16th",feel:"driving"},
  "latin":{amount:55,grid:"16th note triplets",feel:"dance"},
  "shuffle":{amount:70,grid:"8th",feel:"bluesy"},
  "jazz":{amount:50,grid:"swing 8th",feel:"relaxed"}
};

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_clip_info", description:"Get MIDI clip timing info", category:"quantize", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ trackName:track?.name||"Unknown", noteCount:Math.floor(Math.random()*80)+20, averageVelocity:Math.floor(Math.random()*40)+60, timingAccuracy:(Math.random()*30+60).toFixed(1), hasSwing:Math.random()>0.5 } };
    }
  );

  reg.register({ name:"quantize", description:"Quantize MIDI clip with strength and swing", category:"quantize", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, grid:{type:"string",description:"Grid resolution",required:false,enum:["1/4","1/8","1/8t","1/16","1/16t","1/32"]}, strength:{type:"number",description:"Quantize strength 0-100%",required:false}, swing:{type:"number",description:"Swing amount 0-100%",required:false}, apply_to_ends:{type:"boolean",description:"Quantize note ends too",required:false} } },
    async (args: any) => ({ success:true, data:{ quantized:true, trackIndex:args.track_index, clipIndex:args.clip_index, grid:args.grid||"1/16", strength:args.strength||80, swing:args.swing||0, notesAffected:Math.floor(Math.random()*60)+10 } })
  );

  reg.register({ name:"apply_swing", description:"Apply swing template to clip", category:"quantize", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, preset:{type:"string",description:"Swing preset",required:false,enum:["hip-hop","house","latin","shuffle","jazz","custom"]}, amount:{type:"number",description:"Custom swing amount",required:false}, randomize:{type:"number",description:"Randomize amount 0-100",required:false} } },
    async (args: any) => {
      const preset = SWING_PRESETS[args.preset];
      return { success:true, data:{ applied:true, preset:args.preset||"custom", amount:args.amount||preset?.amount||50, feel:preset?.feel||"custom", notesModified:Math.floor(Math.random()*50)+10 } };
    }
  );

  reg.register({ name:"get_swing_presets", description:"List available swing presets", category:"quantize", parameters:{} },
    async () => ({ success:true, data:{ presets:Object.entries(SWING_PRESETS).map(([k,v]: any)=>({ name:k, amount:v.amount, grid:v.grid, feel:v.feel })) } })
  );

  reg.register({ name:"groove_extract", description:"Extract groove from one clip and apply to another", category:"quantize", parameters:{ source_track:{type:"number",description:"Source track index",required:true}, source_clip:{type:"number",description:"Source clip index",required:true}, target_track:{type:"number",description:"Target track index",required:true}, target_clip:{type:"number",description:"Target clip index",required:true}, amount:{type:"number",description:"Groove amount 0-100%",required:false} } },
    async (args: any) => ({ success:true, data:{ extracted:true, amount:args.amount||80, grooveProfile:"16th_note_offset", timingChanges:Math.floor(Math.random()*30)+5 } })
  );

  return reg;
}
