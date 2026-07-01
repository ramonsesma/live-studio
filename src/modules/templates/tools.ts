// Módulo: Project Templates — analyze_project/extract_template now read the REAL track list
// (name, kind, actual device chain) instead of a hardcoded fake ["EQ Eight","Compressor","Reverb"]
// for every track. Extracted templates persist to disk (src/core/storage.ts). apply_template is
// a one-click wizard: pass a genre for a curated built-in starter kit, or a saved template name
// to recreate real tracks + best-effort real device chains (native devices only — insertDevice
// can't load third-party/M4L, so unrecognized names are skipped and reported, not faked).
import { saveJson, loadJson, listJson } from "../../core/storage.js";
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

const SUB = "project_templates";

// Curated one-click starter kits — built from device names already proven to insert
// successfully elsewhere in this toolkit (compressor/eq/vocal modules). Anything that fails to
// insert on a given Live install is simply skipped and reported, same as every other module.
const GENRE_PRESETS: Record<string, { name: string; kind: "midi" | "audio"; devices: string[] }[]> = {
  electronic: [
    { name: "Kick", kind: "midi", devices: ["Drum Rack"] },
    { name: "Bass", kind: "midi", devices: ["Operator", "Compressor"] },
    { name: "Lead", kind: "midi", devices: ["Wavetable", "EQ Eight"] },
    { name: "FX Bus", kind: "audio", devices: ["Reverb", "Delay"] },
  ],
  hiphop: [
    { name: "Drums", kind: "midi", devices: ["Drum Rack", "Compressor"] },
    { name: "808", kind: "midi", devices: ["Operator", "Saturator"] },
    { name: "Keys", kind: "midi", devices: ["Electric"] },
    { name: "Vocals", kind: "audio", devices: ["EQ Eight", "Compressor", "Reverb"] },
  ],
  band: [
    { name: "Drums", kind: "audio", devices: ["EQ Eight", "Glue Compressor"] },
    { name: "Bass", kind: "audio", devices: ["EQ Eight", "Compressor"] },
    { name: "Guitar", kind: "audio", devices: ["EQ Eight", "Overdrive"] },
    { name: "Vocals", kind: "audio", devices: ["EQ Eight", "Compressor", "Reverb"] },
  ],
  podcast: [
    { name: "Host Mic", kind: "audio", devices: ["EQ Eight", "Compressor"] },
    { name: "Guest Mic", kind: "audio", devices: ["EQ Eight", "Compressor"] },
    { name: "Music Bed", kind: "audio", devices: ["EQ Eight"] },
    { name: "SFX", kind: "audio", devices: [] },
  ],
};

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"analyze_project", description:"Analyze the current project's REAL structure (tracks, kind, actual device chains)", category:"template", parameters:{} },
    async (_a: any, song: any) => {
      const tracks = song.tracks || [];
      const trackData = tracks.map((t: any, i: number)=>({
        index:i, name:t.name||`Track ${i+1}`, kind: "createAudioClip" in t ? "audio" : "midi",
        devices:(t.devices||[]).map((d: any)=>d.name), deviceCount:(t.devices||[]).length
      }));
      const sc = (song.scenes||[])[0];
      return { success:true, data:{ trackCount:tracks.length, tempo:song.tempo, signature: sc ? `${sc.signatureNumerator??4}/${sc.signatureDenominator??4}` : "4/4", tracks:trackData, sceneCount:(song.scenes||[]).length } };
    }
  );

  reg.register({ name:"extract_template", description:"Extract the current project's real track/device structure as a reusable template (persists to disk)", category:"template", parameters:{ name:{type:"string",description:"Template name",required:true}, include_colors:{type:"boolean",description:"Include clip colors (advisory context only — Track has no color)",required:false} } },
    async (args: any, song: any) => {
      const tracks = song.tracks || [];
      const structure = tracks.map((t: any) => ({ name:t.name||"Track", kind: "createAudioClip" in t ? "audio" : "midi", devices:(t.devices||[]).map((d: any)=>d.name) }));
      const id = `tpl_${Date.now()}`;
      const record = { id, name:args.name, timestamp:new Date().toISOString(), builtin:false, structure };
      saveJson(SUB, id, record);
      return { success:true, data:{ extracted:true, id, name:args.name, timestamp:record.timestamp, trackCount:structure.length, structure } };
    }
  );

  reg.register({ name:"apply_template", description:"One-click wizard: create real tracks (+ best-effort real device chains) from a built-in genre starter kit OR a saved template", category:"template", parameters:{ genre:{type:"string",description:"Built-in starter kit (one-click wizard)",required:false,enum:Object.keys(GENRE_PRESETS)}, template_id:{type:"string",description:"Saved template id (from extract_template/list_templates) — takes priority over genre",required:false} } },
    async (args: any, song: any) => {
      if (!song?.createMidiTrack || !song?.createAudioTrack) return { success:false, error:"Open a Set in Live to apply a template." };
      let structure: { name: string; kind: string; devices: string[] }[] | null = null;
      let templateName = args.genre || "template";
      if (args.template_id) {
        const saved = loadJson(SUB, args.template_id);
        if (!saved) return { success:false, error:`Template ${args.template_id} not found.` };
        structure = saved.structure; templateName = saved.name;
      } else if (args.genre) {
        structure = GENRE_PRESETS[args.genre];
        if (!structure) return { success:false, error:`Unknown genre: ${args.genre}. Try one of: ${Object.keys(GENRE_PRESETS).join(", ")}` };
      } else {
        return { success:false, error:"Pass either genre (built-in starter kit) or template_id (a saved template)." };
      }
      const created: any[] = [];
      for (const spec of structure) {
        try {
          const t = spec.kind === "audio" ? await song.createAudioTrack() : await song.createMidiTrack();
          try { t.name = spec.name; } catch {}
          const devicesAdded: string[] = [];
          if (typeof t.insertDevice === "function") {
            for (const dn of spec.devices || []) { try { await t.insertDevice(dn, (t.devices||[]).length); devicesAdded.push(dn); } catch { /* not a native device on this Live install — skipped, not faked */ } }
          }
          created.push({ name: spec.name, kind: spec.kind, trackIndex: song.tracks.indexOf(t), devicesRequested: (spec.devices||[]).length, devicesAdded: devicesAdded.length, devices: devicesAdded });
        } catch { /* track creation failed — skip */ }
      }
      if (!created.length) return { success:false, error:"Could not create any tracks." };
      return { success:true, data:{ applied:true, templateName, tracksCreated:created.length, tracks:created } };
    }
  );

  reg.register({ name:"list_templates", description:"List saved templates and the built-in one-click genre starter kits", category:"template", parameters:{} },
    async () => {
      const saved = listJson(SUB).map((t: any) => ({ id:t.id, name:t.name, timestamp:t.timestamp, trackCount:t.structure?.length||0, builtin:false }));
      const builtin = Object.entries(GENRE_PRESETS).map(([genre, structure]) => ({ id:null, genre, name: genre[0].toUpperCase()+genre.slice(1), trackCount:structure.length, builtin:true }));
      return { success:true, data:{ templates:[...builtin, ...saved] } };
    }
  );

  return reg;
}
