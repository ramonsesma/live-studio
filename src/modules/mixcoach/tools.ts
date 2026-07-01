// Módulo: Mix Coach — combines health__run_checks, the resonance masking matrix and auto-gain
// staging into one prioritized "what to do next" list. The real cross-analysis work runs in the
// Bridge (mixCoach, needs resources for render); this documents it for the copilot.
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

  reg.register({ name:"how_it_works", description:"How Mix Coach prioritizes next steps", category:"coach", parameters:{} },
    async () => ({ success:true, data:{ notes:[
      "Press Analyze — it runs the same real health scan, masking matrix and auto-gain plan the Health/Resonance/Auto-Gain panels use, in one pass.",
      "Issues are ranked: project-health errors first, then masking collisions and gain-staging outliers, then warnings/info.",
      "Every suggestion carries the exact tool + arguments that would fix it — click Apply, or ask the copilot to run it.",
      "This doesn't invent new checks — it's the same three real analyses, just triaged into one list instead of run separately.",
      "Programmatic entry: POST /api/mixcoach {} (or { demo:true })." ] } })
  );

  return reg;
}
