// Cliente LLM compatible OpenAI (OpenRouter / OpenAI / OpenCode Zen).
// Portado de ableton-live-ai sin cambios de comportamiento.

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  toolCalls: LLMToolCall[];
}

export interface LLMClient {
  chat(messages: LLMMessage[], tools: unknown[]): Promise<LLMResponse>;
}

interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

function formatTools(definitions: unknown[]): unknown[] {
  return definitions.map((d: any) => ({
    type: "function" as const,
    // El LLM solo necesita name/description/parameters en forma de JSON schema.
    function: {
      name: d.name,
      description: d.description,
      parameters: {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(d.parameters || {}).map(([k, v]: [string, any]) => [
            k,
            { type: v.type === "number" ? "number" : v.type === "boolean" ? "boolean" : "string", description: v.description, ...(v.enum ? { enum: v.enum } : {}) },
          ])
        ),
        required: Object.entries(d.parameters || {}).filter(([, v]: [string, any]) => v.required).map(([k]) => k),
      },
    },
  }));
}

class OpenAICompatibleClient implements LLMClient {
  private config: LLMConfig;
  constructor(config: LLMConfig) { this.config = config; }

  async chat(messages: LLMMessage[], tools: unknown[]): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: messages.map((m) => {
        const msg: Record<string, unknown> = { role: m.role, content: m.content || null };
        if (m.tool_calls) msg.tool_calls = m.tool_calls;
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
        return msg;
      }),
    };
    if (tools.length > 0) {
      body.tools = formatTools(tools);
      body.tool_choice = "auto";
    }

    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
        ...(this.config.baseUrl.includes("openrouter.ai")
          ? { "HTTP-Referer": "https://live-studio.local", "X-Title": "Live Studio" }
          : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM API error ${res.status}: ${text}`);
    }

    const json: any = await res.json();
    const choice = json.choices?.[0];
    if (!choice) throw new Error("No choices in LLM response");
    const msg = choice.message;
    const toolCalls: LLMToolCall[] = (msg.tool_calls || []).map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: safeParse(tc.function.arguments),
    }));
    return { content: msg.content || "", toolCalls };
  }
}

function safeParse(s: string): Record<string, unknown> {
  try { return JSON.parse(s); } catch { return {}; }
}

export function createLLMClient(provider: string, apiKey: string, model: string): LLMClient {
  const baseUrl = provider === "openai"
    ? "https://api.openai.com/v1"
    : provider === "openrouter"
      ? "https://openrouter.ai/api/v1"
      : provider === "opencode-zen"
        ? (process.env.OPENCODE_ZEN_URL || "http://localhost:8080/v1")
        : provider;

  const defaultModel = provider === "openai" ? "gpt-4o"
    : provider === "openrouter" ? "anthropic/claude-3.5-sonnet"
    : provider === "opencode-zen" ? "zen" : "gpt-4o";

  return new OpenAICompatibleClient({ baseUrl, apiKey, model: model || defaultModel });
}
