// Módulo: Clip Version History — reutilizado de examples/clip-version-history
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
  const versions = new Map<string, any[]>();

  reg.register({ name:"save_version", description:"Save current clip state as version", category:"versioning", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, label:{type:"string",description:"Version label",required:false}, description:{type:"string",description:"Change description",required:false} } },
    async (args: any) => {
      const key = `${args.track_index}:${args.clip_index}`;
      const arr = versions.get(key) || [];
      const ver = { id:arr.length+1, label:args.label||`v${arr.length+1}`, description:args.description||"", timestamp:new Date().toISOString(), notes:16, length:4.0 };
      arr.push(ver);
      versions.set(key, arr);
      return { success:true, data:{ version:ver, totalVersions:arr.length } };
    }
  );

  reg.register({ name:"list_versions", description:"List all versions for a clip", category:"versioning", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true} } },
    async (args: any) => {
      const arr = versions.get(`${args.track_index}:${args.clip_index}`) || [];
      return { success:true, data:{ versions:arr, count:arr.length } };
    }
  );

  reg.register({ name:"restore_version", description:"Restore a specific version", category:"versioning", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, version_id:{type:"number",description:"Version ID to restore",required:true} } },
    async (args: any) => {
      const arr = versions.get(`${args.track_index}:${args.clip_index}`) || [];
      const ver = arr.find((v: any)=>v.id===args.version_id);
      if(!ver) return { success:false, error:`Version ${args.version_id} not found` };
      return { success:true, data:{ restored:true, version:ver } };
    }
  );

  reg.register({ name:"diff_versions", description:"Diff two clip versions", category:"versioning", parameters:{ track_index:{type:"number",description:"Track index",required:true}, clip_index:{type:"number",description:"Clip index",required:true}, version_a:{type:"number",description:"Version A",required:true}, version_b:{type:"number",description:"Version B",required:true} } },
    async (args: any) => ({ success:true, data:{ diff:{ notesAdded:3, notesRemoved:1, notesChanged:2, lengthDiff:0.5 }, versionA:args.version_a, versionB:args.version_b } })
  );

  reg.register({ name:"auto_snapshot", description:"Enable auto-snapshot on clip change", category:"versioning", parameters:{ enabled:{type:"boolean",description:"Enable auto-snapshot",required:false}, interval_seconds:{type:"number",description:"Min interval",required:false} } },
    async (args: any) => ({ success:true, data:{ autoSnapshot:args.enabled !== false, interval:args.interval_seconds||30 } })
  );

  return reg;
}
