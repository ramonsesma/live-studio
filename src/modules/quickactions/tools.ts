// Módulo: Comandos Rápidos — vocabulario de 1293 micro-acciones extraído de las 215 *-action.
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

// Aplana el catálogo una vez para búsqueda rápida.
const FLAT: { group: string; name: string; action: string }[] = [];
for (const [group, actions] of QUICK_ACTIONS) {
  for (const [name, action] of actions) FLAT.push({ group, name, action });
}

export function createToolRegistry() {
  const reg = new ToolRegistry();

  reg.register({ name:"list_quick_actions", description:"List all quick actions (micro-action vocabulary)", category:"quick", parameters:{ query:{type:"string",description:"Filter substring",required:false} } },
    async (args: any) => {
      const q = (args.query || "").toLowerCase();
      const items = q ? FLAT.filter(a => (a.group + " " + a.name + " " + a.action).toLowerCase().includes(q)) : FLAT;
      return { success:true, data:{ total:FLAT.length, groups:QUICK_ACTIONS.length, count:items.length, actions:items.slice(0, 2000) } };
    }
  );

  reg.register({ name:"run_quick_action", description:"Run a quick action by group + action name", category:"quick", parameters:{ group:{type:"string",description:"Action group, e.g. 'Transpose'",required:true}, action:{type:"string",description:"Action name, e.g. 'Octave Up'",required:true}, value:{type:"number",description:"Optional numeric value",required:false} } },
    async (args: any) => {
      const group = String(args.group);
      const match = FLAT.find(a => a.group.toLowerCase() === group.toLowerCase() && a.name.toLowerCase() === String(args.action).toLowerCase());
      if (!match) return { success:false, error:`Quick action not found: ${group} / ${args.action}` };
      return { success:true, data:{ ran:true, group:match.group, action:match.name, description:match.action, value:args.value ?? null } };
    }
  );

  return reg;
}
