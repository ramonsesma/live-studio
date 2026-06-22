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

const GRID: Record<string, number> = { "1/4":1, "1/8":0.5, "1/8t":1/3, "1/16":0.25, "1/16t":1/6, "1/32":0.125 };
function getClip(song: any, ti: number, ci: number) {
  const t = song?.tracks?.[ti];
  return t?.clipSlots?.[ci ?? 0]?.clip ?? t?.arrangementClips?.[ci ?? 0] ?? null;
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"get_clip_info", description:"Get MIDI clip timing info", category:"quantize", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const notes = clip.notes || [];
      const vels = notes.map((n: any) => n.velocity ?? 100);
      return { success:true, data:{ clipName:clip.name, noteCount:notes.length, duration:clip.duration, looping:!!clip.looping,
        averageVelocity: vels.length ? Math.round(vels.reduce((a: number, b: number) => a + b, 0) / vels.length) : 0 } };
    }
  );

  reg.register({ name:"quantize", description:"Quantize MIDI clip with strength and swing", category:"quantize", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, grid:{type:"string",description:"Grid resolution",required:false,enum:["1/4","1/8","1/8t","1/16","1/16t","1/32"]}, strength:{type:"number",description:"Quantize strength 0-100%",required:false}, swing:{type:"number",description:"Swing amount 0-100%",required:false}, apply_to_ends:{type:"boolean",description:"Quantize note ends too",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const g = GRID[args.grid || "1/16"] ?? 0.25;
      const strength = (args.strength ?? 100) / 100, swing = (args.swing ?? 0) / 100;
      const notes = (clip.notes || []).slice();
      for (const n of notes) {
        const slot = Math.round(n.startTime / g);
        let target = n.startTime + (slot * g - n.startTime) * strength;
        if (swing > 0 && slot % 2 === 1) target += g * 0.5 * swing;
        n.startTime = Math.max(0, target);
        if (args.apply_to_ends) n.duration = Math.max(g, Math.round(n.duration / g) * g);
      }
      clip.notes = notes;
      return { success:true, data:{ quantized:true, grid:args.grid || "1/16", strength:args.strength ?? 100, swing:args.swing ?? 0, notesAffected:notes.length } };
    }
  );

  reg.register({ name:"apply_swing", description:"Apply swing template to clip", category:"quantize", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, preset:{type:"string",description:"Swing preset",required:false,enum:["hip-hop","house","latin","shuffle","jazz","custom"]}, amount:{type:"number",description:"Custom swing amount",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const preset = SWING_PRESETS[args.preset];
      const amount = (args.amount ?? preset?.amount ?? 50) / 100;
      const g = 0.25;
      const notes = (clip.notes || []).slice();
      let mod = 0;
      for (const n of notes) { if (Math.round(n.startTime / g) % 2 === 1) { n.startTime += g * 0.5 * amount; mod++; } }
      clip.notes = notes;
      return { success:true, data:{ applied:true, preset:args.preset || "custom", amount:Math.round(amount * 100), feel:preset?.feel || "custom", notesModified:mod } };
    }
  );

  reg.register({ name:"get_swing_presets", description:"List available swing presets", category:"quantize", parameters:{} },
    async () => ({ success:true, data:{ presets:Object.entries(SWING_PRESETS).map(([k,v]: any)=>({ name:k, amount:v.amount, grid:v.grid, feel:v.feel })) } })
  );

  reg.register({ name:"groove_extract", description:"Extract groove from one clip and apply to another", category:"quantize", parameters:{ source_track:{type:"number",description:"Source track index",required:true}, source_clip:{type:"number",description:"Source clip index",required:true}, target_track:{type:"number",description:"Target track index",required:true}, target_clip:{type:"number",description:"Target clip index",required:true}, amount:{type:"number",description:"Groove amount 0-100%",required:false} } },
    async (args: any, song: any) => {
      const src = getClip(song, args.source_track, args.source_clip);
      const tgt = getClip(song, args.target_track, args.target_clip);
      if (!src || !tgt) return { success:false, error:"Source or target MIDI clip not found" };
      const g = 0.25, amount = (args.amount ?? 80) / 100;
      const offsets = new Map<number, number>();
      for (const n of (src.notes || [])) { const slot = Math.round(n.startTime / g); offsets.set(slot, n.startTime - slot * g); }
      const notes = (tgt.notes || []).slice();
      let changes = 0;
      for (const n of notes) { const slot = Math.round(n.startTime / g); const off = offsets.get(slot); if (off !== undefined) { n.startTime = Math.max(0, slot * g + off * amount); changes++; } }
      tgt.notes = notes;
      return { success:true, data:{ extracted:true, applied:true, amount:args.amount ?? 80, timingChanges:changes } };
    }
  );

  return reg;
}
