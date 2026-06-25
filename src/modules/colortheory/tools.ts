// Módulo: Color Theory Palette — generates a harmonic palette (complementary / triadic /
// analogous / tetradic / monochromatic) from a base hue and applies REAL clip.color values.
// NOTE: the SDK only exposes clip.color — Track and Scene have no color, so this is clip-scoped.
import { recordColor } from "../../core/history.js";
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

function hexToHsl(hex: string) {
  const m = hex.replace("#", "").match(/.{2}/g)!.map((h) => parseInt(h, 16) / 255);
  const [r, g, b] = m; const max = Math.max(r, g, b), min = Math.min(r, g, b); const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) { const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return { h: h * 360, s, l };
}
function hslToHex(h: number, s: number, l: number) {
  h = ((h % 360) + 360) % 360 / 360;
  const f = (n: number) => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  const to = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255);
  const r = to(f(0)), g = to(f(8)), b = to(f(4));
  return { hex: "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join(""), int: (r << 16) | (g << 8) | b };
}
const SCHEMES: Record<string, number[]> = {
  complementary: [0, 180], triadic: [0, 120, 240], analogous: [-30, 0, 30, 60],
  tetradic: [0, 90, 180, 270], monochromatic: [0, 0, 0, 0, 0],
};
function buildPalette(baseHex: string, scheme: string, count: number) {
  const base = hexToHsl(baseHex);
  const offsets = SCHEMES[scheme] || SCHEMES.triadic;
  const swatches = [];
  for (let i = 0; i < count; i++) {
    const off = offsets[i % offsets.length];
    const ring = Math.floor(i / offsets.length);
    const l = scheme === "monochromatic" ? Math.max(0.2, Math.min(0.85, 0.3 + i * 0.12)) : Math.max(0.3, Math.min(0.7, base.l + ring * 0.12 - 0.06));
    swatches.push(hslToHex(base.h + off, scheme === "monochromatic" ? base.s : base.s, l));
  }
  return swatches;
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"palette", description:"Generate a color-theory palette from a base hex", category:"clips", parameters:{ base_hex:{type:"string",description:"Base color hex (default #FF8C00)",required:false}, scheme:{type:"string",description:"Harmony scheme",required:false,enum:["complementary","triadic","analogous","tetradic","monochromatic"]}, count:{type:"number",description:"How many swatches (default 6)",required:false} } },
    async (args: any) => {
      const scheme = args.scheme || "triadic";
      const swatches = buildPalette(args.base_hex || "#FF8C00", scheme, Math.max(2, Math.min(16, args.count || 6)));
      return { success:true, data:{ scheme, base: args.base_hex || "#FF8C00", swatches } };
    }
  );

  reg.register({ name:"apply_to_track", description:"Color a track's clips with a generated palette (real clip.color write-back)", category:"clips", parameters:{ track_index:{type:"number",description:"Track index",required:true}, base_hex:{type:"string",description:"Base color hex (default #FF8C00)",required:false}, scheme:{type:"string",description:"Harmony scheme",required:false,enum:["complementary","triadic","analogous","tetradic","monochromatic"]} } },
    async (args: any, song: any) => {
      const t = song?.tracks?.[args.track_index]; if (!t) return { success:false, error:"Track not found" };
      const clips = [];
      const slots = t.clipSlots || [];
      for (let i = 0; i < slots.length; i++) { const c = slots[i]?.clip; if (c) clips.push(c); }
      for (const c of (t.arrangementClips || [])) clips.push(c);
      if (!clips.length) return { success:false, error:"No clips on this track to color." };
      const scheme = args.scheme || "triadic";
      const pal = buildPalette(args.base_hex || "#FF8C00", scheme, Math.max(clips.length, 2));
      const applied = [];
      for (let i = 0; i < clips.length; i++) { const sw = pal[i % pal.length]; recordColor(clips[i], args.track_index, i, "colortheory.apply_to_track"); clips[i].color = sw.int; applied.push({ clip: clips[i].name, hex: sw.hex }); }
      return { success:true, data:{ track:t.name, scheme, colored: applied.length, applied } };
    }
  );

  return reg;
}
