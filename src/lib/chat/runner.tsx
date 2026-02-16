import { load_effective_prompt_md } from "@/lib/prompts/system_prompt";
import { stream_openrouter_chat } from "@/lib/openrouter/client";
import type { ChatMessage as OpenRouterChatMessage } from "@/lib/openrouter/types";
import {
  load_openrouter_api_key,
  load_openrouter_model_id,
} from "@/lib/settings/storage";
import { upsert_scene, type SavedScene } from "@/lib/scene/store";

import type { ChatMessage, ChatThreadId } from "@/lib/chat/types";
import {
  get_scene_code,
  parse_model_output,
} from "@/lib/chat/parse";
import { validate_scene_code } from "@/lib/chat/scene_apply";
import { validate_llm_response } from "@/lib/scene/validation";
import { show_error, show_warning, BANNERS, prepare_error_context } from "@/lib/chat/banner";

export type RunOptions = {
  thread_id: ChatThreadId;
  scene: SavedScene;
  history: ChatMessage[];
  user_text: string;
  mode: "ask" | "build" | "fix";
  on_delta: (delta: string) => string | void;
  signal?: AbortSignal;
};

export async function run_chat_turn(options: RunOptions): Promise<void> {
  const api_key = load_openrouter_api_key();
  if (!api_key) {
    const config = BANNERS.API_KEY_NEEDED;
    show_error(config.message, {
      title: config.title,
      actions: config.actions,
    });
    throw new Error("Missing OpenRouter API key. Add it in Settings.");
  }

  // Build messages per docs/context.md specification
  // All prompts loaded fresh every request for correctness

  // 1. System: start.md + api.md (combined)
  const system_prompt = await load_effective_prompt_md("start");
  const api_prompt = await load_effective_prompt_md("api");
  const core_prompts = `${system_prompt}\n\n---\n\n${api_prompt}`;

  // 2. System: scene.md (fresh, if scene exists)
  const has_scene_code = options.scene.sceneCode && options.scene.sceneCode.trim().length > 0;
  let scene_context: string | null = null;
  if (has_scene_code) {
    const scene_prompt = await load_effective_prompt_md("scene");
    scene_context = scene_prompt.replace("{{sceneCode}}", options.scene.sceneCode);
  }

  // 3. System: ask.md or build.md (fresh)
  const mode_prompt = await load_effective_prompt_md(options.mode);

  // Build final message array
  const messages: OpenRouterChatMessage[] = [];

  // Message 1: Core prompts (start + api)
  messages.push({ role: "system", content: core_prompts });

  // Message 2: History (full conversation)
  messages.push(
    ...options.history.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    }))
  );

  // Message 3: Scene context (if exists)
  if (scene_context) {
    messages.push({ role: "system", content: scene_context });
  }

  // Message 4: Mode prompt
  messages.push({ role: "system", content: mode_prompt });

  // Message 5: User message
  messages.push({ role: "user", content: options.user_text });

  let raw = "";
  let assistant_message_id: string | null = null;

  const model_id = load_openrouter_model_id() || "openrouter/auto";

  try {
    for await (const delta of stream_openrouter_chat({
      api_key,
      model: model_id,
      messages,
      signal: options.signal,
    })) {
      raw += delta;
      const returned_id = options.on_delta(delta);
      if (returned_id && assistant_message_id === null) {
        assistant_message_id = returned_id;
      }
    }
  } catch (error) {
    const error_message = error instanceof Error ? error.message : "Unknown error";
    if (error instanceof Error && error.name === "AbortError") {
      return;
    }
    const config = BANNERS.OPENROUTER_ERROR(error_message);
    show_error(config.message, {
      title: config.title,
    });
    throw error;
  }

  const parsed = parse_model_output(raw, options.mode);

  if (options.mode === "ask") {
    return;
  }

  if (parsed.kind === "text") {
    console.log("[Runner] NOTHING_TO_BUILD - setting last error");
    prepare_error_context({
      thread_id: options.thread_id,
      user_message: options.user_text,
      error_message: "No scene code in response",
      invalid_json: raw,
      scene: options.scene,
      mode: options.mode,
    });
    const config = BANNERS.NOTHING_TO_BUILD;
    show_warning(config.message, {
      title: config.title,
      actions: config.actions,
    });
    return;
  }

  const scene_code = get_scene_code(parsed.payload);
  if (!scene_code) {
    const error_msg = "Model returned JSON but no valid scene";
    prepare_error_context({
      thread_id: options.thread_id,
      user_message: options.user_text,
      error_message: error_msg,
      invalid_json: raw,
      scene: options.scene,
      mode: options.mode,
    });
    const config = BANNERS.INVALID_SCENE_CODE;
    show_error(config.message, {
      title: config.title,
      actions: config.actions,
    });
    return;
  }

  // Stage 1: Validate LLM response structure and content
  const llm_validation = validate_llm_response(parsed.payload);
  if (!llm_validation.valid) {
    const error_msg = llm_validation.error ?? "Unknown validation error";
    prepare_error_context({
      thread_id: options.thread_id,
      user_message: options.user_text,
      error_message: error_msg,
      invalid_json: raw,
      scene: options.scene,
      mode: options.mode,
    });
    const config = BANNERS.INVALID_SCENE_CODE;
    show_error(config.message, {
      title: config.title,
      actions: config.actions,
    });
    return;
  }

  // Stage 2: Validate scene code can execute
  const validation = validate_scene_code(scene_code);
  if (!validation.ok) {
    const error_msg = validation.error ?? "Unknown scene error";
    prepare_error_context({
      thread_id: options.thread_id,
      user_message: options.user_text,
      error_message: error_msg,
      invalid_json: raw,
      scene: options.scene,
      mode: options.mode,
    });
    const config = BANNERS.INVALID_SCENE_CODE;
    show_error(config.message, {
      title: config.title,
      actions: config.actions,
    });
    return;
  }

  // Show performance warnings if any
  if (llm_validation.warnings && llm_validation.warnings.length > 0) {
    const config = BANNERS.PERFORMANCE_WARNING(llm_validation.warnings.join("; "));
    show_warning(config.message, {
      title: config.title,
      actions: config.actions,
    });
  }

  // Apply scene.
  upsert_scene({
    ...options.scene,
    updatedAt: Date.now(),
    sceneCode: scene_code,
  });
  window.dispatchEvent(new CustomEvent("stemify:scenes-changed", { detail: { activeId: options.scene.id } }));
}
