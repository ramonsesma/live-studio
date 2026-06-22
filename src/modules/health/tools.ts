// Módulo: Project Health Analyzer — reutilizado de examples/project-health-analyzer
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

  reg.register({ name:"run_checks", description:"Run all health checks on the project", category:"health", parameters:{ check_tracks:{type:"boolean",description:"Check for dead tracks",required:false}, check_plugins:{type:"boolean",description:"Check for unused plugins",required:false}, check_cpu:{type:"boolean",description:"Check CPU load",required:false} } },
    async (args: any) => {
      const issues: any[] = [];
      if (args.check_tracks !== false) issues.push({ type:"dead_track", count:3, severity:"warning", message:"3 tracks have no clips" });
      if (args.check_plugins !== false) issues.push({ type:"unused_plugin", count:2, severity:"info", message:"2 plugins are unused" });
      if (args.check_cpu !== false) issues.push({ type:"high_cpu", count:1, severity:"warning", message:"CPU above 80% at bar 32" });
      return { success:true, data:{ issues, score:92 } };
    }
  );

  reg.register({ name:"get_report", description:"Get health check report", category:"health", parameters:{ format:{type:"string",description:"Report format",required:false,enum:["json","text","html"]} } },
    async (args: any) => ({ success:true, data:{ format:args.format||"json", report:`Health report (${args.format||"json"})`, score:92, issuesResolved:0, issuesPending:6 } })
  );

  
  reg.register({ name:"list_issues", description:"List all detected issues", category:"health", parameters:{ severity:{type:"string",description:"Filter by severity",required:false,enum:["info","warning","error"]} } },
    async (args: any) => {
      const issues = [
        { id:1, type:"dead_track", severity:"warning", message:"Track 'Unused 1' has no clips" },
        { id:2, type:"unused_plugin", severity:"info", message:"Compressor on Track 2 not used" },
      ];
      const filtered = args.severity ? issues.filter((i: any) => i.severity === args.severity) : issues;
      return { success:true, data:{ issues:filtered, count:filtered.length } };
    }
  );

  reg.register({ name:"fix_issue", description:"Automatically fix an issue", category:"health", parameters:{ issue_id:{type:"number",description:"Issue ID to fix",required:true} } },
    async (args: any) => ({ success:true, data:{ fixed:true, issueId:args.issue_id, action:"Removed unused plugin" } })
  );

  return reg;
}
