// Módulo: API Console — a Set scripting console. run_script evals arbitrary JS against the live
// `song`; execute_command is a safe verb interpreter that really mutates the Set; scripts persist
// to the Set's storageDirectory (src/core/storage.ts).
import { saveJson, listJson, loadJson, deleteJson } from "../../core/storage.js";
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
  const SUB = "scripts";

  reg.register({ name:"execute_command", description:"Run a safe console command that really acts on the Set (tempo, tracks, create, rename, marker)", category:"console", parameters:{ command:{type:"string",description:"e.g. 'tempo 128' · 'tracks' · 'create midi' · 'track 0 rename Drums' · 'marker Drop 16'",required:true} } },
    async (args: any, song: any) => {
      const cmd = String(args.command || "").trim(), parts = cmd.split(/\s+/), verb = (parts[0] || "").toLowerCase();
      if (verb === "tempo") { if (parts[1] != null && !isNaN(+parts[1])) { try { song.tempo = Math.max(20, Math.min(300, +parts[1])); } catch {} return { success:true, data:{ command:cmd, set:"tempo", tempo: song.tempo } }; } return { success:true, data:{ command:cmd, tempo: song.tempo || 120 } }; }
      if (verb === "tracks") return { success:true, data:{ command:cmd, trackCount:(song.tracks || []).length, trackNames:(song.tracks || []).map((t: any) => t.name) } };
      if (verb === "scenes") return { success:true, data:{ command:cmd, sceneCount: song.scenes?.length || 0 } };
      if (verb === "create") { const kind = (parts[1] || "midi").toLowerCase(); try { const t = kind === "audio" ? await song.createAudioTrack() : await song.createMidiTrack(); return { success:true, data:{ command:cmd, created:kind, trackIndex: song.tracks.indexOf(t) } }; } catch { return { success:false, error:"create needs Live." }; } }
      if (verb === "track" && (parts[2] || "").toLowerCase() === "rename") { const i = +parts[1], name = parts.slice(3).join(" "), t = song.tracks?.[i]; if (!t) return { success:false, error:"Track not found" }; try { t.name = name; } catch {} return { success:true, data:{ command:cmd, renamed:i, name } }; }
      if (verb === "marker") { if (!song.createCuePoint) return { success:false, error:"Cue points need Live." }; const name = parts[1] || "Marker", bar = +(parts[2] || 0); const cue = await song.createCuePoint(bar * 4); if (cue && "name" in cue) try { cue.name = name; } catch {} return { success:true, data:{ command:cmd, marker:name, bar } }; }
      if (verb === "help" || !verb) return { success:true, data:{ commands:["tempo [N]", "tracks", "scenes", "create midi|audio", "track <i> rename <name>", "marker <name> [bar]", "help"], note:"For arbitrary code use run_script." } };
      return { success:true, data:{ command:cmd, note:"Unknown command — try 'help'. For arbitrary code use run_script." } };
    }
  );

  reg.register({ name:"list_api", description:"Reference of common Live API objects/methods", category:"console", parameters:{ path:{type:"string",description:"API path to explore (e.g. song.tracks)",required:false} } },
    async (args: any) => ({ success:true, data:{ reference:true, path:args.path || "song",
      methods:["song.createMidiTrack()", "song.createAudioTrack()", "song.createCuePoint(time)", "track.insertDevice(name, i)", "track.createMidiClip(start, dur)", "clip.notes = [...]", "param.setValue(v)"],
      properties:["song.tempo", "song.tracks", "song.scenes", "song.cuePoints", "track.clipSlots", "track.devices", "clip.color"] } })
  );

  reg.register({ name:"run_script", description:"Run a multi-line script against the live Set (song, console in scope)", category:"console", parameters:{ script:{type:"string",description:"Script content (multi-line JS)",required:true} } },
    async (args: any, song: any) => {
      const t0 = Date.now();
      try { const result = await new Function("song", "console", `return (async () => {\n${args.script}\n})();`)(song, console); return { success:true, data:{ executed:true, lines:String(args.script).split("\n").length, durationMs:Date.now() - t0, result: result === undefined ? null : result } }; }
      catch (e: any) { return { success:false, error: e?.message || String(e) }; }
    }
  );

  reg.register({ name:"save_script", description:"Save a script to the Set's storage (persists across sessions)", category:"console", parameters:{ name:{type:"string",description:"Script name",required:true}, script:{type:"string",description:"Script content",required:true}, category:{type:"string",description:"Category",required:false} } },
    async (args: any) => {
      const id = `scr_${Date.now()}`;
      saveJson(SUB, id, { id, name: args.name, script: args.script, category: args.category || "custom", ts: new Date().toISOString() });
      return { success:true, data:{ saved:true, id, name:args.name, category:args.category || "custom" } };
    }
  );

  reg.register({ name:"list_saved_scripts", description:"List saved scripts from the Set's storage", category:"console", parameters:{} },
    async () => ({ success:true, data:{ scripts: listJson(SUB).map((s: any) => ({ id:s.id, name:s.name, category:s.category, ts:s.ts, lines:String(s.script || "").split("\n").length })) } })
  );

  reg.register({ name:"run_saved_script", description:"Load a saved script by id and run it against the Set", category:"console", parameters:{ id:{type:"string",description:"Saved script id",required:true} } },
    async (args: any, song: any) => {
      const s = loadJson(SUB, args.id); if (!s) return { success:false, error:"Script not found" };
      const t0 = Date.now();
      try { const result = await new Function("song", "console", `return (async () => {\n${s.script}\n})();`)(song, console); return { success:true, data:{ ran:s.name, durationMs:Date.now() - t0, result: result === undefined ? null : result } }; }
      catch (e: any) { return { success:false, error: e?.message || String(e) }; }
    }
  );

  reg.register({ name:"delete_saved_script", description:"Delete a saved script by id", category:"console", parameters:{ id:{type:"string",description:"Saved script id",required:true} } },
    async (args: any) => { const ok = deleteJson(SUB, args.id); return { success: ok, data:{ deleted: ok, id:args.id }, error: ok ? undefined : "Script not found" }; }
  );

  return reg;
}
