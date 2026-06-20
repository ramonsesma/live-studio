// Módulo: Groove & Humanize — reutilizado de examples/groove-editor
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

  reg.register({ name:"extract_groove", description:"Extract groove timing from a MIDI clip", category:"groove", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (args: any, song: any) => {
      const track = song.tracks[args.track_index];
      return { success:true, data:{ extracted:true, trackName:track?.name||"Unknown", grooveProfile:{ name:`Groove from ${track?.name}`, type:"timing", feel:Math.random()>0.5?"laid-back":"pushed", strength:Math.floor(Math.random()*30)+60, offsetRange:`-${Math.floor(Math.random()*10+5)} to +${Math.floor(Math.random()*10+5)} ticks` } } };
    }
  );

  reg.register({ name:"apply_groove", description:"Apply a groove template to a MIDI clip", category:"groove", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, amount:{type:"number",description:"Groove amount 0-100%",required:false}, randomize:{type:"number",description:"Randomize 0-100%",required:false} } },
    async (args: any) => ({ success:true, data:{ applied:true, trackIndex:args.track_index, clipIndex:args.clip_index, amount:args.amount||75, randomize:args.randomize||10, notesModified:Math.floor(Math.random()*50)+15, newFeel:"swung" } })
  );

  reg.register({ name:"save_groove", description:"Save current groove as a named template", category:"groove", parameters:{ name:{type:"string",description:"Groove template name",required:true}, category:{type:"string",description:"Category",required:false,enum:["timing","velocity","both"]} } },
    async (args: any) => ({ success:true, data:{ saved:true, name:args.name, category:args.category||"both", timestamp:new Date().toISOString(), templateId:`grv_${Date.now()}` } })
  );

  reg.register({ name:"list_grooves", description:"List saved groove templates", category:"groove", parameters:{} },
    async () => ({
      success:true, data:{ grooves:[
        { name:"Tight 16th", category:"timing", source:"808 hi-hats", date:"2025-03-10" },
        { name:"Lo-Fi Shuffle", category:"both", source:"Vinyl drum break", date:"2025-04-22" },
        { name:"Trap Roll", category:"timing", source:"Hi-hat rolls", date:"2025-05-15" },
        { name:"Soul Swing", category:"timing", source:"Soul drum break", date:"2025-06-01" }
      ]}
    })
  );

  reg.register({ name:"extract_velocity", description:"Extract velocity pattern from a clip as a groove", category:"groove", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (_args: any) => ({ success:true, data:{ extracted:true, velocityProfile:{ min:40, max:127, average:Math.floor(Math.random()*30+70), accentPattern:"4-on-the-floor with snare accents" } } })
  );

  return reg;
}
