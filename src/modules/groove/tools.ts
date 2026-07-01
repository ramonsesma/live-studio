// Módulo: Groove & Humanize — groove templates now persist to disk (src/core/storage.ts)
// instead of a fixed fake catalog that ignored what was actually saved.
import { recordNotes } from "../../core/history.js";
import { saveJson, listJson } from "../../core/storage.js";
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

const SUB = "groove_templates";

function getClip(song: any, ti: number, ci: number) {
  const t = song?.tracks?.[ti];
  return t?.clipSlots?.[ci ?? 0]?.clip ?? t?.arrangementClips?.[ci ?? 0] ?? null;
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"extract_groove", description:"Extract groove timing from a MIDI clip", category:"groove", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const g = 0.25;
      const offsets = (clip.notes || []).map((n: any) => { const slot = Math.round(n.startTime / g); return { slot, offset:+(n.startTime - slot * g).toFixed(4) }; });
      const avg = offsets.length ? offsets.reduce((a: number, o: any) => a + o.offset, 0) / offsets.length : 0;
      return { success:true, data:{ extracted:true, clipName:clip.name, noteCount:offsets.length, feel: avg > 0.005 ? "laid-back" : avg < -0.005 ? "pushed" : "on-grid", avgOffset:+avg.toFixed(4), offsets } };
    }
  );

  reg.register({ name:"apply_groove", description:"Humanize/groove a MIDI clip's timing and velocity", category:"groove", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, amount:{type:"number",description:"Groove amount 0-100%",required:false}, randomize:{type:"number",description:"Velocity randomize 0-100%",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const amount = (args.amount ?? 75) / 100, rnd = (args.randomize ?? 10) / 100;
      recordNotes(clip, args.track_index, args.clip_index, "groove.apply_groove");
      const notes = (clip.notes || []).slice();
      for (const n of notes) {
        n.startTime = Math.max(0, n.startTime + (Math.random() * 2 - 1) * 0.04 * amount);
        if (rnd > 0) n.velocity = Math.max(1, Math.min(127, Math.round((n.velocity ?? 100) + (Math.random() * 2 - 1) * 30 * rnd)));
      }
      clip.notes = notes;
      return { success:true, data:{ applied:true, amount:args.amount ?? 75, randomize:args.randomize ?? 10, notesModified:notes.length } };
    }
  );

  reg.register({ name:"save_groove", description:"Extract the real timing/velocity groove from a clip and save it as a named template (persists to disk)", category:"groove", parameters:{ name:{type:"string",description:"Groove template name",required:true}, track_index:{type:"number",description:"Source clip's track index",required:true}, clip_index:{type:"number",description:"Source clip index (default 0)",required:false}, category:{type:"string",description:"Category",required:false,enum:["timing","velocity","both"]} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index ?? 0);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const g = 0.25;
      const offsets = (clip.notes || []).map((n: any) => { const slot = Math.round(n.startTime / g); return +(n.startTime - slot * g).toFixed(4); });
      const velocities = (clip.notes || []).map((n: any) => n.velocity ?? 100);
      const id = `grv_${Date.now()}`;
      const groove = { id, name:args.name, category:args.category||"both", source:clip.name, timestamp:new Date().toISOString(), offsets, velocities };
      saveJson(SUB, id, groove);
      return { success:true, data:{ saved:true, name:args.name, category:groove.category, templateId:id, noteCount:offsets.length } };
    }
  );

  reg.register({ name:"list_grooves", description:"List saved groove templates", category:"groove", parameters:{} },
    async () => ({ success:true, data:{ grooves: listJson(SUB).map((g: any) => ({ name:g.name, category:g.category, source:g.source, date:g.timestamp?.slice(0,10) })) } })
  );

  reg.register({ name:"extract_velocity", description:"Extract velocity pattern from a clip as a groove", category:"groove", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index);
      if (!clip) return { success:false, error:"MIDI clip not found" };
      const vels = (clip.notes || []).map((n: any) => n.velocity ?? 100);
      if (!vels.length) return { success:true, data:{ extracted:true, velocityProfile:{ min:0, max:0, average:0, count:0 } } };
      return { success:true, data:{ extracted:true, velocityProfile:{ min:Math.min(...vels), max:Math.max(...vels), average:Math.round(vels.reduce((a: number, b: number) => a + b, 0) / vels.length), count:vels.length } } };
    }
  );

  return reg;
}
