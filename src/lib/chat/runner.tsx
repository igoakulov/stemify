import { load_effective_prompt_md } from "@/lib/prompts/system_prompt";
import { stream_openrouter_chat } from "@/lib/openrouter/client";
import type { ChatMessage as OpenRouterChatMessage } from "@/lib/openrouter/types";
import {
  load_openrouter_api_key,
  load_openrouter_model_id,
} from "@/lib/settings/storage";
import { log_scene_generated } from "@/lib/settings/scene-log";
import { add_version, ensure_version_history, get_scene_code as get_scene_code_from_store, type SavedScene } from "@/lib/scene/store";

import type { ChatMessage, ChatThreadId } from "@/lib/chat/types";
import { parse_model_output } from "@/lib/chat/parse";
import { validate_scene_code, validate_llm_response } from "@/lib/scene/validation";
import {
  show_error,
  show_warning,
  BANNERS,
  prepare_error_context,
} from "@/lib/chat/banner";

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

  // 2. System: scene.md (fresh, if scene exists) - use current version's code
  const effective_scene_code = get_scene_code_from_store(options.scene);
  const has_scene_code =
    effective_scene_code && effective_scene_code.trim().length > 0;
  let scene_context: string | null = null;
  if (has_scene_code) {
    const scene_prompt = await load_effective_prompt_md("scene");
    scene_context = scene_prompt.replace(
      "{{sceneCode}}",
      effective_scene_code,
    );
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
    })),
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
    const error_message =
      error instanceof Error ? error.message : "Unknown error";
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
    prepare_error_context({
      thread_id: options.thread_id,
      user_message: options.user_text,
      error_message:
        "Response must contain scene code in a code block. Use ```javascript ``` to wrap your scene code.",
      invalid_json: raw,
      scene: options.scene,
      mode: options.mode,
    });
    const config = BANNERS.INVALID_SCENE_CODE;
    show_error(config.message, {
      title: config.title,
      actions: config.actions,
    });
    log_scene_generated({
      scene_id: options.scene.id,
      llm_model: model_id,
      llm_response: {},
      success: false,
      error: JSON.stringify([{ type: "syntax", message: "Response must be JS format" }]),
    });
    return;
  }

  const scene_code = parsed.code;

  // Stage 1: Validate LLM response structure and content
  const llm_validation = validate_llm_response(scene_code);
  if (!llm_validation.ok) {
    const error_msg = llm_validation.errors.length > 0 
      ? llm_validation.errors.map(e => e.message).join("; ")
      : "Unknown validation error";
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
    log_scene_generated({
      scene_id: options.scene.id,
      llm_model: model_id,
      llm_response: { code: scene_code },
      success: false,
      error: JSON.stringify(llm_validation.errors),
    });
    return;
  }

  // Stage 2: Validate scene code can execute
  const validation = validate_scene_code(scene_code);
  if (!validation.ok) {
    const error_msg = validation.errors.length > 0 
      ? validation.errors.map(e => e.message).join("; ")
      : "Unknown scene error";
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
    log_scene_generated({
      scene_id: options.scene.id,
      llm_model: model_id,
      llm_response: { code: scene_code },
      success: false,
      error: JSON.stringify(validation.errors),
    });
    return;
  }

  // Show performance warnings if any
  if (llm_validation.warnings && llm_validation.warnings.length > 0) {
    const config = BANNERS.PERFORMANCE_WARNING(
      llm_validation.warnings.join("; "),
    );
    show_warning(config.message, {
      title: config.title,
      actions: config.actions,
    });
  }

  // Ensure version history exists (for legacy scenes)
  const scene_with_versions = ensure_version_history(options.scene);

  // Add new version from LLM response
  add_version(scene_with_versions, options.user_text, scene_code);

  log_scene_generated({
    scene_id: scene_with_versions.id,
    llm_model: model_id,
    llm_response: { code: scene_code },
    success: true,
  });

  window.dispatchEvent(
    new CustomEvent("stemify:scenes-changed", {
      detail: { activeId: options.scene.id, source: "llm" },
    }),
  );
}
