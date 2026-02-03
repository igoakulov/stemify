import type { PromptId } from "@/lib/prompts/store";
import { stream_openrouter_chat } from "@/lib/openrouter/client";
import { load_openrouter_api_key, load_openrouter_model_id } from "@/lib/settings/storage";
import { load_effective_prompt_md } from "@/lib/prompts/system_prompt";

const TITLE_MAX_CHARS = 50;
const CHEAP_MODEL_ID = "openrouter/free";

async function try_generate_title(
  model_id: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: { signal?: AbortSignal },
): Promise<string> {
  let raw = "";

  for await (const delta of stream_openrouter_chat({
    api_key: load_openrouter_api_key(),
    model: model_id,
    messages,
    signal: options.signal,
  })) {
    raw += delta;
  }

  const title = raw.trim();
  return title.length > TITLE_MAX_CHARS ? title.slice(0, TITLE_MAX_CHARS).trim() + "..." : title;
}

export async function generate_title(
  first_user_message: string,
  options: { signal?: AbortSignal } = {},
): Promise<string> {
  const api_key = load_openrouter_api_key();
  if (!api_key) {
    throw new Error("Missing API key for title generation");
  }

  const system_prompt = await load_effective_prompt_md("generate_title" as PromptId);

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: system_prompt },
    { role: "user", content: first_user_message },
  ];

  try {
    return await try_generate_title(CHEAP_MODEL_ID, messages, options);
  } catch {
    const fallback_model_id = load_openrouter_model_id();
    if (!fallback_model_id || fallback_model_id === CHEAP_MODEL_ID) {
      return "Untitled Conversation";
    }

    try {
      return await try_generate_title(fallback_model_id, messages, options);
    } catch {
      return "Untitled Conversation";
    }
  }
}
