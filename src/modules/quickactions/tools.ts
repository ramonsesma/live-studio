// Módulo: Comandos Rápidos — atajos a tools reales con args preestablecidos.
// Cada quick action enruta a un tool real; la paleta (shell.js) ejecuta `tool` con `args`.
import { QUICK_ACTIONS } from "./catalog.js";

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

  reg.register({ name:"list_quick_actions", description:"List the quick actions (each routes to a real tool)", category:"quick", parameters:{ query:{type:"string",description:"Filter substring",required:false} } },
    async (args: any) => {
      const q = (args.query || "").toLowerCase();
      const items = q ? QUICK_ACTIONS.filter(a => (a.group + " " + a.name + " " + a.tool).toLowerCase().includes(q)) : QUICK_ACTIONS;
      return { success:true, data:{ total:QUICK_ACTIONS.length, count:items.length, actions:items } };
    }
  );

  // Resolve a quick action to the real tool + args to run. The palette executes that
  // tool via /api/execute (cross-module dispatch happens in the shell, not here).
  reg.register({ name:"run_quick_action", description:"Resolve a quick action to the real tool + args to run", category:"quick", parameters:{ group:{type:"string",description:"Action group, e.g. 'Tempo'",required:true}, action:{type:"string",description:"Action name, e.g. '128 BPM'",required:true} } },
    async (args: any) => {
      const qa = QUICK_ACTIONS.find(a => a.group.toLowerCase() === String(args.group).toLowerCase() && a.name.toLowerCase() === String(args.action).toLowerCase());
      if (!qa) return { success:false, error:`Quick action not found: ${args.group} / ${args.action}` };
      return { success:true, data:{ route: { name: qa.tool, args: qa.args } } };
    }
  );

  return reg;
}
