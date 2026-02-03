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
  get_comment_markdown,
  get_scene_code,
  parse_model_output,
} from "@/lib/chat/parse";
import { validate_scene_code } from "@/lib/chat/scene_apply";
import { get_thread, replace_message } from "@/lib/chat/store";
import { show_error, show_warning } from "@/lib/chat/banner";

export type RunOptions = {
  thread_id: ChatThreadId;
  scene: SavedScene;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  user_text: string;
  mode: "ask" | "build";
  on_delta: (delta: string) => string | void;
  signal: AbortSignal;
};

export async function run_chat_turn(options: RunOptions): Promise<void> {
  const api_key = load_openrouter_api_key();
  if (!api_key) {
    show_error(
      <>
        Please add your{" "}
        <a
          href="https://openrouter.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          OpenRouter
        </a>{" "}
        API key in Settings to send messages.
      </>,
      {
        title: "API Key Needed",
        actions: [
          {
            label: "Add API key",
            onClick: () => {
              window.dispatchEvent(new CustomEvent("stemify:open-settings"));
            },
          },
        ],
      }
    );
    throw new Error("Missing OpenRouter API key. Add it in Settings.");
  }

  const system_prompt = await load_effective_prompt_md("start");
  const mode_prompt = await load_effective_prompt_md(options.mode);

  const messages: OpenRouterChatMessage[] = [
    { role: "system", content: system_prompt },
    { role: "system", content: mode_prompt },
    ...options.history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: options.user_text },
  ];

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
    show_error(`Failed to get response from OpenRouter: ${error_message}`, {
      title: "OpenRouter Error",
    });
    throw error;
  }

  const parsed = parse_model_output(raw);

  if (options.mode === "ask") {
    // In ASK mode, we never attempt to parse/apply a scene.
    return;
  }

  if (parsed.kind === "text") {
    show_warning("Assistant's response has no scene code, nothing to BUILD ;(", {
      title: "Nothing to BUILD",
      actions: [
        {
          label: "Try again",
          onClick: () => {},
        },
      ],
    });
    throw new Error("Build mode expected JSON but received plain text.");
  }

  const scene_code = get_scene_code(parsed.payload);
  if (!scene_code) {
    show_warning("Assistant's response has no scene code, nothing to BUILD ;(", {
      title: "Nothing to BUILD",
      actions: [
        {
          label: "Try again",
          onClick: () => {},
        },
      ],
    });
    throw new Error("Model returned JSON but no valid scene.sceneCode.");
  }

  const validation = validate_scene_code(scene_code);
  if (!validation.ok) {
    show_error("Assistant's code for the scene is invalid. Try making your prompt more clear.", {
      title: "Scene Code Issue",
      actions: [
        {
          label: "Edit prompt",
          onClick: () => {},
        },
      ],
    });
    throw new Error(`Invalid scene code: ${validation.error ?? "Unknown error"}`);
  }

  // Apply scene.
  upsert_scene({
    ...options.scene,
    updatedAt: Date.now(),
    sceneCode: scene_code,
  });
  window.dispatchEvent(new CustomEvent("stemify:scenes-changed", { detail: { activeId: options.scene.id } }));

  // Render comment into the assistant message if present.
  const md = get_comment_markdown(parsed.payload);
  if (md && assistant_message_id) {
    const thread = get_thread(options.thread_id);
    const current_msg = thread.messages.find((m: ChatMessage) => m.id === assistant_message_id);
    if (current_msg) {
      const json_block = "```json\n" + raw.trim() + "\n```";
      const combined_content = json_block + "\n\n" + md;
      replace_message(options.thread_id, assistant_message_id, {
        content: combined_content,
      });
      window.dispatchEvent(new Event("stemify:chat-changed"));
      return;
    }
  }

  // Scene applied but comment missing/invalid - still show the JSON
  if (assistant_message_id) {
    const json_block = "```json\n" + raw.trim() + "\n```";
    replace_message(options.thread_id, assistant_message_id, {
      content: json_block,
    });
    window.dispatchEvent(new Event("stemify:chat-changed"));
  }
}
