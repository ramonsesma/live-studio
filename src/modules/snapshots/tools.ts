// Módulo: Snapshot System — reutilizado de examples/snapshot-system
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
  const snapshots: any[] = [];

  reg.register({ name:"save_snapshot", description:"Save current set state", category:"snapshot", parameters:{ name:{type:"string",description:"Snapshot name",required:true}, description:{type:"string",description:"Short description",required:false} } },
    async (args: any, song: any) => {
      const snap = { id:snapshots.length+1, name:args.name, description:args.description||"", tracks:(song.tracks||[]).slice(0,5).map((t: any, i: number)=>({ index:i, name:t.name||`Track ${i+1}`, volume:Math.random()*100 })), timestamp:new Date().toISOString() };
      snapshots.push(snap);
      return { success:true, data:{ snapshot:snap, total:snapshots.length } };
    }
  );

  reg.register({ name:"load_snapshot", description:"Load a saved snapshot", category:"snapshot", parameters:{ snapshot_id:{type:"number",description:"Snapshot ID",required:true} } },
    async (args: any) => {
      const snap = snapshots.find((s: any)=>s.id===args.snapshot_id);
      if(!snap) return { success:false, error:`Snapshot ${args.snapshot_id} not found` };
      return { success:true, data:{ restored:true, snapshot:snap } };
    }
  );

  reg.register({ name:"delete_snapshot", description:"Delete a snapshot", category:"snapshot", parameters:{ snapshot_id:{type:"number",description:"Snapshot ID",required:true} } },
    async (args: any) => {
      const idx=snapshots.findIndex((s: any)=>s.id===args.snapshot_id);
      if(idx===-1) return { success:false, error:`Snapshot ${args.snapshot_id} not found` };
      snapshots.splice(idx,1);
      return { success:true, data:{ deleted:true } };
    }
  );

  reg.register({ name:"list_snapshots", description:"List all saved snapshots", category:"snapshot", parameters:{} },
    async () => ({ success:true, data:{ snapshots, count:snapshots.length } })
  );

  reg.register({ name:"rename_snapshot", description:"Rename a snapshot", category:"snapshot", parameters:{ snapshot_id:{type:"number",description:"Snapshot ID",required:true}, new_name:{type:"string",description:"New name",required:true} } },
    async (args: any) => {
      const snap=snapshots.find((s: any)=>s.id===args.snapshot_id);
      if(!snap) return { success:false, error:`Snapshot ${args.snapshot_id} not found` };
      snap.name=args.new_name;
      return { success:true, data:{ renamed:true, newName:args.new_name } };
    }
  );

  return reg;
}
