import { DEMO_TOOLS } from "../registry/demo-tools.js";

// MasterRegistry: fusiona los toolRegistry de cada módulo SIN tocar sus internals.
// Cada módulo expone { definitions: ToolDefinition[], execute(name,args,song) }.
// Aquí los "absorbemos" delegando la ejecución y namespaceando nombre/categoría,
// de modo que añadir un módulo nuevo = una línea, y la UI/IA los ven uniformemente.

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    enum?: string[];
  }>;
  // metadatos añadidos por el master:
  module?: string;
  originalName?: string;
  demo?: boolean; // handler devuelve datos simulados (ver registry/demo-tools.ts)
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Forma mínima que cumple cualquier toolRegistry de los módulos existentes.
export interface ChildRegistry {
  definitions: ToolDefinition[];
  execute(name: string, args: Record<string, unknown>, song: any): Promise<ToolResult> | ToolResult;
}

export interface ModuleSpec {
  id: string;          // p.ej. "chords"
  label: string;       // p.ej. "Acordes & Progresiones"
  icon: string;        // emoji
  description?: string;
  hidden?: boolean;    // no aparece como pestaña (p.ej. backend de la paleta)
  registry: ChildRegistry;
}

export interface ModuleInfo {
  id: string;
  label: string;
  icon: string;
  description: string;
  toolCount: number;
  hidden: boolean;
}

export class MasterRegistry {
  definitions: ToolDefinition[] = [];
  private handlers = new Map<string, (args: Record<string, unknown>, song: any) => Promise<ToolResult> | ToolResult>();
  private modules: ModuleInfo[] = [];

  addModule(mod: ModuleSpec): void {
    let count = 0;
    for (const def of mod.registry.definitions) {
      const fqName = `${mod.id}__${def.name}`;
      const namespaced: ToolDefinition = {
        ...def,
        name: fqName,
        category: mod.id,
        module: mod.id,
        originalName: def.name,
        demo: DEMO_TOOLS.has(fqName),
      };
      this.definitions.push(namespaced);
      const original = def.name;
      this.handlers.set(fqName, (args, song) => mod.registry.execute(original, args, song));
      count++;
    }
    this.modules.push({
      id: mod.id,
      label: mod.label,
      icon: mod.icon,
      description: mod.description || "",
      toolCount: count,
      hidden: !!mod.hidden,
    });
  }

  // Add a single tool to an already-registered module, backed by an arbitrary handler instead
  // of a module's own ChildRegistry. Used for capabilities that need the Bridge's `resources`/
  // `environment` (audio render, disk storage) — those can't live behind the plain (args, song)
  // signature every module handler gets, so the Bridge wires them in directly after construction
  // (see Bridge.registerBridgeTools). This is what makes e.g. mix analysis or snapshot save/
  // restore reachable from the AI copilot's run_tool, not just from a panel's own fetch calls.
  addTool(moduleId: string, def: Omit<ToolDefinition, "module" | "originalName" | "demo">, handler: (args: Record<string, unknown>) => Promise<ToolResult> | ToolResult): void {
    const fqName = `${moduleId}__${def.name}`;
    if (this.handlers.has(fqName)) return; // don't shadow an existing tool
    this.definitions.push({ ...def, category: moduleId, module: moduleId, originalName: def.name, demo: DEMO_TOOLS.has(fqName) });
    this.handlers.set(fqName, (args) => handler(args));
    const mod = this.modules.find((m) => m.id === moduleId);
    if (mod) mod.toolCount++;
  }

  async execute(name: string, args: Record<string, unknown>, song: any): Promise<ToolResult> {
    const handler = this.handlers.get(name);
    if (!handler) return { success: false, error: `Unknown tool: ${name}` };
    try {
      return await handler(args, song);
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  getDefinitionsJson(): ToolDefinition[] {
    return this.definitions;
  }

  getModules(): ModuleInfo[] {
    return this.modules;
  }

  // Tools de un módulo concreto (para la UI por pestañas).
  getModuleTools(moduleId: string): ToolDefinition[] {
    return this.definitions.filter((d) => d.module === moduleId);
  }
}
