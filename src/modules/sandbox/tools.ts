// Módulo: Live Coding Sandbox — reutilizado de examples/live-coding-sandbox
// Nota: eval_typescript ejecuta código del propio usuario contra `song` (herramienta creativa).
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
  const scripts = new Map<string, any>();

  reg.register({ name:"eval_typescript", description:"Evaluate TypeScript code in sandbox", category:"sandbox", parameters:{ code:{type:"string",description:"TypeScript code to evaluate",required:true}, return_value:{type:"boolean",description:"Capture return value",required:false} } },
    async (args: any, song: any) => {
      try {
        const result = await new Function('song', 'return (async () => {' + args.code + '})()')(song);
        return { success:true, data:{ result:args.return_value ? result : undefined, executed:true } };
      } catch(e) {
        return { success:false, error:String(e) };
      }
    }
  );

  
  reg.register({ name:"get_api_autocomplete", description:"Get SDK API autocomplete suggestions", category:"sandbox", parameters:{ prefix:{type:"string",description:"Type prefix",required:true} } },
    async (args: any) => {
      const apis = ["song.tracks","song.tempo","song.createMidiTrack","track.createMidiClip","clip.addNote","device.setParameter"];
      return { success:true, data:{ suggestions:apis.filter((a: string) => a.startsWith(args.prefix)) } };
    }
  );

  reg.register({ name:"list_safe_globals", description:"List available safe globals in sandbox", category:"sandbox", parameters:{} },
    async () => ({ success:true, data:{ globals:["song","console","setTimeout","fetch","JSON","Math","Date"] } })
  );

  
  return reg;
}
