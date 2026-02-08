"use client";

import {
  AssistantRuntimeProvider,
  type AppendMessage,
  type ThreadMessageLike,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { useCallback, useSyncExternalStore, useRef, useEffect, useReducer } from "react";

import type { SavedScene } from "@/lib/scene/store";
import { upsert_scene } from "@/lib/scene/store";
import type { ChatMessage, ChatThreadId } from "@/lib/chat/types";
import {
  append_message,
  ensure_thread,
  get_thread,
  set_is_running,
  set_thread,
  update_message_content,
} from "@/lib/chat/store";
import { load_openrouter_model_id } from "@/lib/settings/storage";
import { show_error, BANNERS } from "@/lib/chat/banner";
import { get_current_abort_controller, set_current_abort_controller } from "@/lib/chat/store";

export type ResolvedThread = {
  threadId: string;
  scene: SavedScene;
};

type ChatRuntimeProviderProps = {
  thread_id: string | null;
  on_resolve_thread: () => Promise<ResolvedThread>;
  children: React.ReactNode;
  on_send_user_message: (options: {
    thread_id: ChatThreadId;
    scene: SavedScene;
    user_text: string;
    mode: "ask" | "build";
    model_id: string | undefined;
    on_first_delta: (assistant_message_id: string) => void;
  }) => Promise<void>;
  on_first_assistant_response?: (options: {
    thread_id: ChatThreadId;
    first_user_message: string;
    scene: SavedScene;
  }) => Promise<void>;
};

function to_thread_message_like(message: ChatMessage): ThreadMessageLike {
  return {
    id: message.id,
    role: message.role,
    createdAt: new Date(message.created_at),
    content: [{ type: "text", text: message.content }],
    metadata: {
      custom: {
        stemify_mode: message.meta?.mode,
      },
    },
  };
}

export function create_message_id(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const EMPTY_THREAD_STATE = {
  messages: [] as const,
  is_running: false as const,
  mode: "ask" as const,
  model: "openrouter/auto",
  createdAt: 0,
  updatedAt: 0,
};

export function ChatRuntimeProvider(props: ChatRuntimeProviderProps) {
  const { thread_id, on_resolve_thread, children, on_send_user_message, on_first_assistant_response } = props;

  const thread_id_ref = useRef(thread_id);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    thread_id_ref.current = thread_id;
    forceUpdate();
  }, [thread_id]);

  const empty_state_ref = useRef(EMPTY_THREAD_STATE);

  const subscribe = useCallback((on_store_change: () => void) => {
    const on_change = () => on_store_change();
    window.addEventListener("stemify:chat-changed", on_change);
    return () => window.removeEventListener("stemify:chat-changed", on_change);
  }, []);

  const get_snapshot = useCallback(() => {
    const current_thread_id = thread_id_ref.current;
    if (!current_thread_id) {
      return empty_state_ref.current;
    }
    const mode = "ask";
    const model_id = load_openrouter_model_id() || "openrouter/auto";
    ensure_thread(current_thread_id, mode, model_id);
    return get_thread(current_thread_id);
  }, []);

  const state = useSyncExternalStore(subscribe, get_snapshot, get_snapshot);

  const setMessages = useCallback(
    (messages: readonly ChatMessage[]) => {
      const current_thread_id = thread_id_ref.current;
      if (!current_thread_id) return;
      set_thread(current_thread_id, { ...state, messages: [...messages] });
      window.dispatchEvent(new Event("stemify:chat-changed"));
    },
    [state],
  );

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const part = message.content[0];
      if (!part || part.type !== "text") {
        throw new Error("Only text messages are supported");
      }

      const user_text = part.text;
      const raw_mode = message.runConfig?.custom?.stemify_mode;
      const mode: "ask" | "build" = raw_mode === "build" ? "build" : "ask";

      // Resolve thread first - this creates the scene if needed
      const resolved = await on_resolve_thread();
      const resolved_thread_id = resolved.threadId;
      const resolved_scene = resolved.scene;

      const user_msg: ChatMessage = {
        id: create_message_id("msg_user"),
        role: "user",
        content: user_text,
        created_at: Date.now(),
        meta: {
          mode,
          model_id: resolved_scene.id,
        },
      };
      append_message(resolved_thread_id, user_msg);

      // Update scene's updatedAt to reflect chat activity
      upsert_scene({
        ...resolved_scene,
        updatedAt: Date.now(),
      });
      window.dispatchEvent(new CustomEvent("stemify:scenes-changed", { detail: { activeId: resolved_scene.id } }));

      set_is_running(resolved_thread_id, true);
      window.dispatchEvent(new Event("stemify:chat-changed"));

      // Start title generation in background (runs even if user exits early)
      if (on_first_assistant_response) {
        on_first_assistant_response({
          thread_id: resolved_thread_id,
          first_user_message: user_text,
          scene: resolved_scene,
        }).catch(() => {}); // Suppress errors - title generation is best-effort
      }

      // Create and store abort controller for immediate cancellation
      const controller = new AbortController();
      set_current_abort_controller(controller);

      try {
        await on_send_user_message({
          thread_id: resolved_thread_id,
          scene: resolved_scene,
          user_text,
          mode,
          model_id: resolved_scene.id,
          on_first_delta: async (assistant_message_id) => {
            const assistant_msg: ChatMessage = {
              id: assistant_message_id,
              role: "assistant",
              content: "",
              created_at: Date.now(),
              meta: {
                mode,
                model_id: resolved_scene.id,
              },
            };
            append_message(resolved_thread_id, assistant_msg);
            window.dispatchEvent(new Event("stemify:chat-changed"));
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "An error occurred";
        const config = BANNERS.GENERIC_ERROR(message);
        show_error(config.message, {
          title: config.title,
          actions: config.actions,
        });
        window.dispatchEvent(new Event("stemify:chat-changed"));
      } finally {
        set_current_abort_controller(null);
        set_is_running(resolved_thread_id, false);
        window.dispatchEvent(new Event("stemify:chat-changed"));
      }
    },
    [on_send_user_message, on_first_assistant_response, on_resolve_thread],
  );

  const onCancel = useCallback(async () => {
    if (!thread_id) return;
    // Abort using global controller first
    const controller = get_current_abort_controller();
    controller?.abort();
    set_current_abort_controller(null);
    set_is_running(thread_id, false);
    window.dispatchEvent(new Event("stemify:chat-changed"));
  }, [thread_id]);

  const onReload = useCallback(
    async (parent_id: string | null) => {
      if (!thread_id) return;
      const snapshot = get_thread(thread_id);

      const mode: "ask" | "build" = "ask";

      let user_text: string | null = null;

      if (parent_id) {
        const idx = snapshot.messages.findIndex((m) => m.id === parent_id);
        if (idx >= 0) {
          for (let i = idx; i >= 0; i -= 1) {
            const m = snapshot.messages[i];
            if (m.role === "user") {
              user_text = m.content;
              break;
            }
          }
        }
      }

      if (!user_text) {
        for (let i = snapshot.messages.length - 1; i >= 0; i -= 1) {
          const m = snapshot.messages[i];
          if (m.role === "user") {
            user_text = m.content;
            break;
          }
        }
      }

      if (!user_text) return;

      // Resolve thread for reload too
      const resolved = await on_resolve_thread();
      const resolved_thread_id = resolved.threadId;
      const resolved_scene = resolved.scene;

      set_is_running(resolved_thread_id, true);
      window.dispatchEvent(new Event("stemify:chat-changed"));

      try {
        await on_send_user_message({
          thread_id: resolved_thread_id,
          scene: resolved_scene,
          user_text,
          mode,
          model_id: resolved_scene.id,
          on_first_delta: (assistant_message_id) => {
            const assistant_msg: ChatMessage = {
              id: assistant_message_id,
              role: "assistant",
              content: "",
              created_at: Date.now(),
              meta: {
                mode,
                model_id: resolved_scene.id,
              },
            };
            append_message(resolved_thread_id, assistant_msg);
            window.dispatchEvent(new Event("stemify:chat-changed"));
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "An error occurred";
        const config = BANNERS.GENERIC_ERROR(message);
        show_error(config.message, {
          title: config.title,
          actions: config.actions,
        });
        window.dispatchEvent(new Event("stemify:chat-changed"));
      } finally {
        set_is_running(resolved_thread_id, false);
        window.dispatchEvent(new Event("stemify:chat-changed"));
      }
    },
    [on_send_user_message, thread_id, on_resolve_thread],
  );

  const runtime = useExternalStoreRuntime<ChatMessage>({
    messages: state.messages,
    isRunning: state.is_running,
    onNew,
    onCancel,
    onReload,
    setMessages,
    convertMessage: (m) => to_thread_message_like(m),
  });

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}

export function append_to_assistant_message(options: {
  thread_id: ChatThreadId;
  assistant_message_id: string;
  delta: string;
}) {
  update_message_content(options.thread_id, options.assistant_message_id, options.delta);
  window.dispatchEvent(new Event("stemify:chat-changed"));
}
