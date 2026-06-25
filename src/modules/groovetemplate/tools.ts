// Módulo: Groove Template Extractor — reads a clip's micro-timing (note.startTime deviation
// from the grid) into a groove template and applies it to another clip by nudging its notes.
// The .agr-free way to move a feel between clips. Pure note math.
import { recordNotes } from "../../core/history.js";
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

function getClip(song: any, ti: number, ci: number) { const t = song?.tracks?.[ti]; return t?.clipSlots?.[ci ?? 0]?.clip ?? t?.arrangementClips?.[ci ?? 0]; }
const PERIOD = 16; // 1 bar of 1/16 steps

function extractTemplate(notes: any[], grid: number) {
  const sumOff = new Array(PERIOD).fill(0), sumVel = new Array(PERIOD).fill(0), count = new Array(PERIOD).fill(0);
  for (const n of notes) {
    const gridIdx = Math.round(n.startTime / grid), step = ((gridIdx % PERIOD) + PERIOD) % PERIOD;
    sumOff[step] += n.startTime - gridIdx * grid; sumVel[step] += n.velocity ?? 100; count[step]++;
  }
  const steps = Array.from({ length: PERIOD }, (_, s) => ({ step: s, avgOffset: count[s] ? sumOff[s] / count[s] : 0, avgVel: count[s] ? Math.round(sumVel[s] / count[s]) : null, count: count[s] }));
  return { grid, period: PERIOD, steps };
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"extract_template", description:"Extract a micro-timing groove template from a clip's note timing", category:"groove", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (default 0)",required:false}, grid_beats:{type:"number",description:"Grid in beats (default 0.25 = 1/16)",required:false} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index ?? 0);
      if (!clip || !Array.isArray(clip.notes) || !clip.notes.length) return { success:false, error:"No MIDI clip with notes here." };
      const grid = args.grid_beats || 0.25;
      const tpl = extractTemplate(clip.notes, grid);
      const tempo = song?.tempo || 120;
      // swing = average lateness of off-beat steps (those not on a downbeat, step % 4 !== 0)
      const off = tpl.steps.filter((s) => s.count > 0 && s.step % 4 !== 0);
      const swingMs = off.length ? Math.round((off.reduce((a, s) => a + s.avgOffset, 0) / off.length) * (60 / tempo) * 1000) : 0;
      return { success:true, data:{ clipName:clip.name, grid, period:PERIOD, swingMs, steps: tpl.steps.map((s) => ({ ...s, offsetMs: Number((s.avgOffset * (60 / tempo) * 1000).toFixed(1)) })) } };
    }
  );

  reg.register({ name:"apply_template", description:"Quantize a target clip to grid and add a source clip's groove (micro-timing + optional velocity). Excluded pitches keep their original human timing (out of the pocket).", category:"groove", parameters:{ target_track:{type:"number",description:"Target track index",required:true}, target_clip:{type:"number",description:"Target clip index (default 0)",required:false}, source_track:{type:"number",description:"Groove source track index",required:true}, source_clip:{type:"number",description:"Groove source clip index (default 0)",required:false}, strength:{type:"number",description:"0-100% how much groove to apply (default 100)",required:false}, apply_velocity:{type:"boolean",description:"Also apply the source's velocity feel",required:false}, grid_beats:{type:"number",description:"Grid in beats (default 0.25)",required:false}, exclude_pitches:{type:"string",description:"Comma-separated pitches to keep OUT of the pocket (e.g. '36' = kick stays straight/human)",required:false} } },
    async (args: any, song: any) => {
      const src = getClip(song, args.source_track, args.source_clip ?? 0);
      const tgt = getClip(song, args.target_track, args.target_clip ?? 0);
      if (!src || !Array.isArray(src.notes) || !src.notes.length) return { success:false, error:"Groove source has no notes." };
      if (!tgt || !Array.isArray(tgt.notes) || !tgt.notes.length) return { success:false, error:"Target clip has no notes." };
      const grid = args.grid_beats || 0.25, strength = Math.max(0, Math.min(1, (args.strength ?? 100) / 100));
      const excluded = new Set<number>(String(args.exclude_pitches || "").split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n)));
      const tpl = extractTemplate(src.notes, grid);
      let moved = 0, locked = 0;
      const out = tgt.notes.map((n: any) => {
        if (excluded.has(n.pitch)) { locked++; return { pitch: n.pitch, startTime: n.startTime, duration: n.duration, velocity: n.velocity }; }
        const gridIdx = Math.round(n.startTime / grid), step = ((gridIdx % PERIOD) + PERIOD) % PERIOD;
        const tplOff = tpl.steps[step]?.avgOffset ?? 0;
        const newStart = Math.max(0, gridIdx * grid + tplOff * strength);
        if (Math.abs(newStart - n.startTime) > 1e-6) moved++;
        const vel = args.apply_velocity && tpl.steps[step]?.avgVel ? Math.round(n.velocity * (1 - strength) + tpl.steps[step].avgVel * strength) : n.velocity;
        return { pitch: n.pitch, startTime: newStart, duration: n.duration, velocity: vel };
      });
      recordNotes(tgt, args.target_track, args.target_clip ?? 0, "groovetemplate.apply_template");
      tgt.notes = out;
      return { success:true, data:{ applied:true, notesMoved:moved, notesLocked:locked, notesTotal:out.length, excludedPitches:[...excluded], sourceClip:src.name, targetClip:tgt.name, strength:Math.round(strength*100) } };
    }
  );

  reg.register({ name:"set_lane_dynamics", description:"Set an independent dynamic range per drum element (pitch): centers velocity and writes native velocityDeviation so Live varies each lane on its own.", category:"groove", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (default 0)",required:false}, lanes:{type:"string",description:"Per-pitch ranges 'pitch:min-max' (deviation auto) or 'pitch:min-max:dev', comma-separated. E.g. '36:96-104,42:55-95:18'",required:true} } },
    async (args: any, song: any) => {
      const clip = getClip(song, args.track_index, args.clip_index ?? 0);
      if (!clip || !Array.isArray(clip.notes) || !clip.notes.length) return { success:false, error:"No MIDI clip with notes here." };
      const spec = new Map<number, { center: number; dev: number; min: number; max: number }>();
      for (const part of String(args.lanes || "").split(",").map((s) => s.trim()).filter(Boolean)) {
        const m = part.match(/^(\d+)\s*:\s*(\d+)\s*-\s*(\d+)(?:\s*:\s*(\d+))?$/);
        if (!m) continue;
        const pitch = +m[1], min = Math.min(+m[2], +m[3]), max = Math.max(+m[2], +m[3]);
        const dev = m[4] != null ? +m[4] : Math.round((max - min) / 2);
        spec.set(pitch, { center: Math.round((min + max) / 2), dev: Math.max(0, dev), min, max });
      }
      if (!spec.size) return { success:false, error:"No valid lane specs. Use 'pitch:min-max' e.g. '36:96-104,42:55-95:18'." };
      let affected = 0; const lanesTouched = new Set<number>();
      recordNotes(clip, args.track_index, args.clip_index ?? 0, "groovetemplate.set_lane_dynamics");
      clip.notes = clip.notes.map((n: any) => {
        const s = spec.get(n.pitch);
        if (!s) return n;
        affected++; lanesTouched.add(n.pitch);
        return { ...n, velocity: Math.max(1, Math.min(127, s.center)), velocityDeviation: s.dev };
      });
      return { success:true, data:{ clip:clip.name, affected, lanes: [...spec.entries()].map(([pitch, s]) => ({ pitch, center: s.center, deviation: s.dev, range: `${s.min}-${s.max}`, applied: lanesTouched.has(pitch) })) } };
    }
  );

  return reg;
}
