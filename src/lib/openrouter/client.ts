import type {
  ChatMessage,
  OpenRouterError,
  OpenRouterModel,
  OpenRouterStreamDelta,
} from "@/lib/openrouter/types";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export function build_openrouter_headers(api_key: string): Headers {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${api_key}`);
  headers.set("Content-Type", "application/json");

  // Optional but recommended by OpenRouter:
  // https://openrouter.ai/docs/api/reference/authentication
  headers.set("X-Title", "STEMify");

  return headers;
}

export async function list_openrouter_models(api_key: string): Promise<OpenRouterModel[]> {
  const res = await fetch(`${OPENROUTER_BASE_URL}/models`, {
    method: "GET",
    headers: build_openrouter_headers(api_key),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  const data = (await res.json()) as { data?: OpenRouterModel[] };
  return data.data ?? [];
}

export type StreamChatOptions = {
  api_key: string;
  model: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
};

// Streaming SSE per OpenRouter docs:
// https://openrouter.ai/docs/api/reference/streaming
export async function* stream_openrouter_chat(
  options: StreamChatOptions,
): AsyncGenerator<string, void, void> {
  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: build_openrouter_headers(options.api_key),
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
    }),
    signal: options.signal,
  });

  if (!res.ok) {
    const text = await res.text();

    // Attempt to parse OpenRouter-style JSON error
    try {
      const parsed = JSON.parse(text) as OpenRouterError;
      const message = parsed.error?.message;
      if (message) throw new Error(message);
    } catch {
      // ignore parsing errors
    }

    throw new Error(text);
  }

  if (!res.body) {
    throw new Error("No response body for streaming request");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by blank lines.
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const lines = part.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const data = trimmed.slice("data:".length).trim();
        if (!data) continue;
        if (data === "[DONE]") return;

        const json = JSON.parse(data) as OpenRouterStreamDelta;
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      }
    }
  }
}
