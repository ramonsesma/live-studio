import { MasterRegistry } from "./core/registry.js";
import type { LLMClient, LLMMessage } from "./core/llm.js";

const SYSTEM_PROMPT = `Eres el copiloto de Live Studio, integrado en Ableton Live 12. Controlas Live usando las herramientas disponibles (organizadas por módulos: session__, chords__, drums__, eq__).

REGLAS:
- Para conocer el estado del set usa session__get_session_info y session__get_all_tracks.
- Los índices de pistas/clips empiezan en 0.
- Usa la herramienta más específica disponible. Si una falla, informa el error y sugiere alternativa.
- Responde en el mismo idioma que el usuario y resume qué hiciste.`;

const MAX_ITERATIONS = 10;

export interface ChatRequest {
  messages: LLMMessage[];
  systemPrompt?: string;
}
export interface ChatResponse {
  content: string;
  messages: LLMMessage[];
  toolCalls: number;
}

export class Bridge {
  constructor(private registry: MasterRegistry, private song: any) {}

  getTools() { return this.registry.getDefinitionsJson(); }
  getModules() { return this.registry.getModules(); }

  async executeTool(name: string, args: Record<string, unknown>) {
    return this.registry.execute(name, args, this.song);
  }

  async processChat(req: ChatRequest, client: LLMClient): Promise<ChatResponse> {
    const prompt = req.systemPrompt || SYSTEM_PROMPT;
    const messages: LLMMessage[] = [{ role: "system", content: prompt }, ...req.messages];
    let totalToolCalls = 0;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await client.chat(messages, this.registry.getDefinitionsJson());

      if (response.toolCalls.length === 0) {
        messages.push({ role: "assistant", content: response.content });
        return { content: response.content, messages: this.trim(messages), toolCalls: totalToolCalls };
      }

      totalToolCalls += response.toolCalls.length;
      messages.push({
        role: "assistant",
        content: response.content,
        tool_calls: response.toolCalls.map((tc) => ({ id: tc.id, type: "function" as const, function: { name: tc.name, arguments: JSON.stringify(tc.arguments) } })),
      });

      for (const tc of response.toolCalls) {
        const result = await this.registry.execute(tc.name, tc.arguments, this.song);
        messages.push({ role: "tool", content: JSON.stringify(result), tool_call_id: tc.id });
      }
    }

    return { content: "Se alcanzó el máximo de iteraciones. Simplifica tu solicitud.", messages: this.trim(messages), toolCalls: totalToolCalls };
  }

  private trim(messages: LLMMessage[]): LLMMessage[] {
    if (messages.length <= 20) return messages;
    return [messages[0], { role: "user", content: "[historial truncado]" }, ...messages.slice(-10)];
  }
}
