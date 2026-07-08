import { recordParam } from "../../core/history.js";
import { mulberry32 } from "../../core/slicefx.js";
// Módulo: Safe Randomizer — nudges a device's parameters within a bounded fraction of their
// range (so it explores without breaking the sound), skipping locked params. Locks and the
// pre-randomize state persist to storageDirectory. Heavy work in the Bridge (/api/saferandom).
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
  reg.register({ name:"how_safe_random_works", description:"How the Safe Randomizer explores device parameters without breaking the sound", category:"macros", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Open the Safe Randomizer on a track + device, set the Amount (how far each param can move, as a % of its range) and press Randomize.",
      "Each parameter is nudged within ±Amount of its CURRENT value (not the full range), so you explore variations instead of chaos.",
      "Click a knob's lock to keep a parameter fixed — locks persist per device in storageDirectory. Reset restores the values from before the last randomize.",
      "Pairs with Macro Snapshot Morph and Project Snapshot for a full preset-exploration toolkit.",
      "Programmatic entry: POST /api/saferandom { action: 'read'|'randomize'|'reset'|'lock'|'unlock', trackIndex, deviceIndex, amount?, paramName? }." ] } })
  );

  // Section classifier: env before lfo before filter before osc (param names like "LFO Rate"
  // or "Env Attack" must not be swallowed by broader regexes further down the list).
  const SECTIONS: [string, RegExp][] = [
    ["env", /\b(env(elope)?\s?\d?|attack|decay|sustain|release)\b/i],
    ["lfo", /\b(lfo\s?\d?|s\s?&\s?h|sample\s?(and|&)\s?hold|rate)\b/i],
    ["filter", /\b(filter|fil\s?\d|hp\d*|lp\d*|cutoff|freq(uency)?|res(onance)?|morph|slope|key\s?track)\b/i],
    ["osc", /\b(osc(illator)?\s?[a-d1-4]?|op\s?[a-d]|wave(table)?|position|shape|coarse|fine|detune|pitch|transpose|octave|semi)\b/i],
    ["fx", /\b(chorus|delay|reverb|drive|dist(ortion)?|saturat|noise|spread|unison|width|feedback)\b/i],
    ["mix", /\b(volume|gain|pan|mix|glide|porta(mento)?|voices|global|out(put)?)\b/i],
  ];
  const classify = (name: string): string => { for (const [sec, re] of SECTIONS) if (re.test(name)) return sec; return "other"; };
  const KNOWN_SYNTHS = /drift|wavetable|operator|analog|meld|drum synth|electric|tension|collision/i;

  reg.register({ name:"list_synth_sections", description:"Read a device's REAL parameters and group them into semantic sections (osc/filter/env/lfo/fx/mix) — knows Ableton's native synths, generic fallback for anything else", category:"macros", parameters:{ track_index:{type:"number",description:"Track",required:true}, device_index:{type:"number",description:"Device (default 0)",required:false} } },
    async (args: any, song: any) => {
      const device = song?.tracks?.[args.track_index]?.devices?.[args.device_index ?? 0];
      if (!device) return { success:false, error:"Device not found" };
      const params = device.parameters || [];
      if (!params.length) return { success:false, error:"Device exposes no parameters." };
      const groups: Record<string, string[]> = {};
      for (const p of params) { const s = classify(p.name || ""); (groups[s] = groups[s] || []).push(p.name); }
      return { success:true, data:{ device:device.name, recognizedSynth:KNOWN_SYNTHS.test(device.name || ""), paramCount:params.length, sections:Object.entries(groups).map(([sec, names]) => ({ section:sec, count:names.length, params:names.slice(0, 24) })) } };
    }
  );

  reg.register({ name:"randomize_sections", description:"Randomize ONLY the chosen semantic sections of a device (osc/filter/env/lfo/fx/mix), each param nudged ±amount% of its full range from its CURRENT value — seeded (reproducible), quantized params skipped, every change undoable", category:"macros", parameters:{ track_index:{type:"number",description:"Track",required:true}, device_index:{type:"number",description:"Device (default 0)",required:false}, sections:{type:"string",description:"Comma-separated sections, e.g. \"osc,filter\" (default all except mix)",required:false}, amount:{type:"number",description:"Max move as % of each param's range (default 25)",required:false}, seed:{type:"number",description:"Same seed = same result",required:false} } },
    async (args: any, song: any) => {
      const ti = args.track_index, di = args.device_index ?? 0;
      const device = song?.tracks?.[ti]?.devices?.[di];
      if (!device) return { success:false, error:"Device not found" };
      const params = device.parameters || [];
      if (!params.length) return { success:false, error:"Device exposes no parameters." };
      const want = String(args.sections || "osc,filter,env,lfo,fx").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      const amount = Math.max(1, Math.min(100, args.amount ?? 25)) / 100;
      const rand = mulberry32(typeof args.seed === "number" ? args.seed : Math.floor(Math.random() * 1e9));
      let changed = 0, skippedQuantized = 0;
      const bySection: Record<string, number> = {};
      for (const p of params) {
        const sec = classify(p.name || "");
        if (!want.includes(sec)) continue;
        if (p.isQuantized) { skippedQuantized++; continue; } // enum-ish params can break the patch — skip
        if (typeof p.getValue !== "function" || typeof p.setValue !== "function") continue;
        const min = typeof p.min === "number" ? p.min : 0;
        const max = typeof p.max === "number" ? p.max : 1;
        const cur = await p.getValue();
        const next = Math.max(min, Math.min(max, cur + (rand() * 2 - 1) * amount * (max - min)));
        if (next === cur) continue;
        await recordParam(p, ti, di, "saferandom.randomize_sections");
        await p.setValue(next);
        changed++; bySection[sec] = (bySection[sec] || 0) + 1;
      }
      if (!changed) return { success:false, error:"Nothing matched those sections (or everything was quantized)." };
      return { success:true, data:{ device:device.name, sections:want, amountPct:Math.round(amount * 100), paramsChanged:changed, bySection, skippedQuantized, undoable:true } };
    }
  );

  return reg;
}
