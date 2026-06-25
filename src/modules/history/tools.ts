// Módulo: Edit History — a global undo for every destructive edit across the toolkit. Modules
// record a restore snapshot in src/core/history.ts before mutating; this exposes undo/list/clear.
import { history, keyClip, keyTrack, keyDevice } from "../../core/history.js";

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

function keyFor(args: any): string | null {
  const scope = args.scope || "clip";
  if (scope === "track" && args.track_index != null) return keyTrack(args.track_index);
  if (scope === "device" && args.track_index != null) return keyDevice(args.track_index, args.device_index ?? 0);
  if (scope === "clip" && args.track_index != null) return keyClip(args.track_index, args.clip_index ?? 0);
  return null;
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"undo_last", description:"Undo the most recent destructive edit from ANY module (global)", category:"utility", parameters:{} },
    async () => {
      const e = await history.undoLast();
      if (!e) return { success:false, error:"Nothing to undo." };
      return { success:true, data:{ undone:e.label, target:e.key, remaining: history.depth() } };
    }
  );

  reg.register({ name:"undo_target", description:"Undo the latest edit on a specific clip/track/device", category:"utility", parameters:{ scope:{type:"string",description:"What to undo",required:false,enum:["clip","track","device"]}, track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index (clip scope, default 0)",required:false}, device_index:{type:"number",description:"Device index (device scope, default 0)",required:false} } },
    async (args: any) => {
      const k = keyFor(args); if (!k) return { success:false, error:"Provide a track_index (and clip/device index for that scope)." };
      const e = await history.undoTarget(k);
      if (!e) return { success:false, error:`Nothing to undo for ${k}.` };
      return { success:true, data:{ undone:e.label, target:e.key, remaining: history.depth() } };
    }
  );

  reg.register({ name:"list", description:"List recent destructive edits (most recent first)", category:"utility", parameters:{ limit:{type:"number",description:"How many (default 25)",required:false} } },
    async (args: any) => ({ success:true, data:{ total: history.depth(), entries: history.list(Math.max(1, Math.min(100, args.limit || 25))) } })
  );

  reg.register({ name:"clear", description:"Clear the edit history (everything, or one target)", category:"utility", parameters:{ scope:{type:"string",description:"Limit to a target",required:false,enum:["clip","track","device"]}, track_index:{type:"number",description:"Track index (for a scoped clear)",required:false}, clip_index:{type:"number",description:"Clip index",required:false}, device_index:{type:"number",description:"Device index",required:false} } },
    async (args: any) => {
      const k = args.track_index != null ? keyFor(args) : null;
      const removed = history.clear(k || undefined);
      return { success:true, data:{ cleared: removed, scope: k || "all", remaining: history.depth() } };
    }
  );

  return reg;
}
