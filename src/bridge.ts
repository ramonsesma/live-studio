import { MasterRegistry } from "./core/registry.js";
import type { LLMClient, LLMMessage } from "./core/llm.js";

const SYSTEM_PROMPT = `You are the Live Studio copilot, integrated into Ableton Live 12. You control Live using the available tools (organized by module: session__, chords__, drums__, eq__, …).

RULES:
- To know the state of the set use session__get_session_info and session__get_all_tracks.
- Track/clip indices start at 0.
- Use the most specific tool available. If one fails, report the error and suggest an alternative.
- Reply in the same language the user is using and summarize what you did.`;

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

    return { content: "Max iterations reached. Please simplify your request.", messages: this.trim(messages), toolCalls: totalToolCalls };
  }

  private trim(messages: LLMMessage[]): LLMMessage[] {
    if (messages.length <= 20) return messages;
    return [messages[0], { role: "user", content: "[history truncated]" }, ...messages.slice(-10)];
  }
}
