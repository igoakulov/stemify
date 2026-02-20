"use client";

import {
  AssistantRuntimeProvider,
  type AppendMessage,
  type ThreadMessageLike,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import {
  useCallback,
  useSyncExternalStore,
  useRef,
  useEffect,
  useReducer,
  createContext,
  useContext,
} from "react";

import type { SavedScene } from "@/lib/scene/store";
import { upsert_scene } from "@/lib/scene/store";
import type { ChatMessage, ChatThreadId } from "@/lib/chat/types";
import {
  append_message,
  ensure_thread,
  get_thread,
  set_is_running,
  set_thread,
  trim_messages,
  update_message_content,
  get_current_abort_controller,
  set_current_abort_controller,
} from "@/lib/chat/store";
import { load_openrouter_model_id } from "@/lib/settings/storage";
import {
  show_error,
  BANNERS,
  get_error_context,
  clear_error_context,
  clear_banner,
  set_fix_mode,
} from "@/lib/chat/banner";
import { load_effective_prompt_md } from "@/lib/prompts/system_prompt";

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
    mode: "ask" | "build" | "fix";
    model_id: string | undefined;
    on_first_delta: (assistant_message_id: string) => void;
    history?: ChatMessage[];
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
  const {
    thread_id,
    on_resolve_thread,
    children,
    on_send_user_message,
    on_first_assistant_response,
  } = props;

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
          model_id: load_openrouter_model_id(),
        },
      };
      append_message(resolved_thread_id, user_msg);

      // Update scene's updatedAt to reflect chat activity
      upsert_scene({
        ...resolved_scene,
        updatedAt: Date.now(),
      });
      window.dispatchEvent(
        new CustomEvent("stemify:scenes-changed", {
          detail: { activeId: resolved_scene.id },
        }),
      );

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
          model_id: load_openrouter_model_id(),
          on_first_delta: async (assistant_message_id) => {
            const assistant_msg: ChatMessage = {
              id: assistant_message_id,
              role: "assistant",
              content: "",
              created_at: Date.now(),
              meta: {
                mode,
                model_id: load_openrouter_model_id(),
              },
            };
            append_message(resolved_thread_id, assistant_msg);
            window.dispatchEvent(new Event("stemify:chat-changed"));
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An error occurred";
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

  const onEdit = useCallback(
    async (editedMessage: AppendMessage) => {
      if (!thread_id) return;

      const part = editedMessage.content[0];
      if (!part || part.type !== "text") {
        throw new Error("Only text messages are supported");
      }

      const edited_text = part.text;

      // Cancel any ongoing streaming
      const controller = get_current_abort_controller();
      controller?.abort();
      set_current_abort_controller(null);
      set_is_running(thread_id, false);

      // Find the last user message in the thread (the one being edited)
      const state = get_thread(thread_id);
      
      // Find the last user message - that's the one being edited
      let idx = -1;
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].role === "user") {
          idx = i;
          break;
        }
      }

      if (idx < 0) return;

      // Get mode from original message (not from runConfig)
      const originalMessage = state.messages[idx];
      const mode: "ask" | "build" =
        originalMessage.meta?.mode === "build" ? "build" : "ask";

      // Replace the message content and trim everything after
      // Explicitly preserve all fields to avoid any issues
      const updatedMessage: ChatMessage = {
        id: originalMessage.id,
        role: originalMessage.role,
        content: edited_text,
        created_at: originalMessage.created_at,
        meta: originalMessage.meta,
      };
      const next_messages: ChatMessage[] = [
        ...state.messages.slice(0, idx),
        updatedMessage,
      ];
      set_thread(thread_id, { ...state, messages: next_messages });

      // Resolve thread and start new response
      const resolved = await on_resolve_thread();
      const resolved_thread_id = resolved.threadId;
      const resolved_scene = resolved.scene;

      set_is_running(resolved_thread_id, true);
      window.dispatchEvent(new Event("stemify:chat-changed"));

      try {
        await on_send_user_message({
          thread_id: resolved_thread_id,
          scene: resolved_scene,
          user_text: edited_text,
          mode,
          model_id: load_openrouter_model_id(),
          on_first_delta: (assistant_message_id) => {
            const assistant_msg: ChatMessage = {
              id: assistant_message_id,
              role: "assistant",
              content: "",
              created_at: Date.now(),
              meta: {
                mode,
                model_id: load_openrouter_model_id(),
              },
            };
            append_message(resolved_thread_id, assistant_msg);
            window.dispatchEvent(new Event("stemify:chat-changed"));
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An error occurred";
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
    [thread_id, on_send_user_message, on_resolve_thread],
  );

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
          model_id: load_openrouter_model_id(),
          on_first_delta: (assistant_message_id) => {
            const assistant_msg: ChatMessage = {
              id: assistant_message_id,
              role: "assistant",
              content: "",
              created_at: Date.now(),
              meta: {
                mode,
                model_id: load_openrouter_model_id(),
              },
            };
            append_message(resolved_thread_id, assistant_msg);
            window.dispatchEvent(new Event("stemify:chat-changed"));
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An error occurred";
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

  useEffect(() => {
    const handle_retry = async () => {
      const error_ctx = get_error_context();
      if (!error_ctx) return;

      const retry_prompt = await load_effective_prompt_md("fix");
      const error_context_text = retry_prompt
        .replace("{{errors}}", error_ctx.error_message)
        .replace("{{invalid_json}}", error_ctx.invalid_json || "");

      const snapshot = get_thread(error_ctx.thread_id);

      const last_user_idx = snapshot.messages.findLastIndex(
        (m) => m.role === "user",
      );
      let truncated_messages = snapshot.messages;
      if (last_user_idx >= 0) {
        truncated_messages = snapshot.messages.slice(0, last_user_idx + 1);
      }

      if (truncated_messages.length !== snapshot.messages.length) {
        set_thread(error_ctx.thread_id, {
          ...snapshot,
          messages: truncated_messages,
        });
      }

      const history: ChatMessage[] = truncated_messages.map((m) => ({ ...m }));

      history.unshift({
        id: create_message_id("msg_system"),
        role: "system",
        content: error_context_text,
        created_at: Date.now(),
        meta: {},
      });

      clear_error_context();
      clear_banner();
      set_fix_mode(true);

      const controller = new AbortController();
      set_current_abort_controller(controller);

      set_is_running(error_ctx.thread_id, true);
      window.dispatchEvent(new Event("stemify:chat-changed"));

      try {
        await on_send_user_message({
          thread_id: error_ctx.thread_id,
          scene: error_ctx.scene,
          user_text: error_ctx.user_message,
          mode: "fix",
          model_id: load_openrouter_model_id(),
          history,
          on_first_delta: async (assistant_message_id) => {
            const assistant_msg: ChatMessage = {
              id: assistant_message_id,
              role: "assistant",
              content: "",
              created_at: Date.now(),
              meta: {
                mode: "fix" as const,
                model_id: load_openrouter_model_id(),
              },
            };
            append_message(error_ctx.thread_id, assistant_msg);
            window.dispatchEvent(new Event("stemify:chat-changed"));
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An error occurred";
        const config = BANNERS.GENERIC_ERROR(message);
        show_error(config.message, {
          title: config.title,
          actions: config.actions,
        });
        window.dispatchEvent(new Event("stemify:chat-changed"));
      } finally {
        set_current_abort_controller(null);
        set_is_running(error_ctx.thread_id, false);
        set_fix_mode(false);
        window.dispatchEvent(new Event("stemify:chat-changed"));
      }
    };

    window.addEventListener("stemify:retry-failed", handle_retry);
    return () => {
      window.removeEventListener("stemify:retry-failed", handle_retry);
    };
  }, [on_send_user_message]);

  const runtime = useExternalStoreRuntime<ChatMessage>({
    messages: state.messages,
    isRunning: state.is_running,
    onNew,
    onCancel,
    onReload,
    onEdit,
    setMessages,
    convertMessage: (m) => to_thread_message_like(m),
  });

  return (
    <ChatThreadProvider threadId={thread_id}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </ChatThreadProvider>
  );
}

export function append_to_assistant_message(options: {
  thread_id: ChatThreadId;
  assistant_message_id: string;
  delta: string;
}) {
  update_message_content(
    options.thread_id,
    options.assistant_message_id,
    options.delta,
  );
  window.dispatchEvent(new Event("stemify:chat-changed"));
}

type ChatThreadContextType = {
  threadId: string | null;
  trimToMessage: (messageId: string) => void;
};

const ChatThreadContext = createContext<ChatThreadContextType | null>(null);

export function useChatThread() {
  return useContext(ChatThreadContext);
}

function ChatThreadProvider({
  threadId,
  children,
}: {
  threadId: string | null;
  children: React.ReactNode;
}) {
  const trimToMessage = useCallback(
    (messageId: string) => {
      if (!threadId) return;

      const controller = get_current_abort_controller();
      controller?.abort();
      set_current_abort_controller(null);
      set_is_running(threadId, false);

      const state = get_thread(threadId);
      const idx = state.messages.findIndex((m) => m.id === messageId);
      if (idx >= 0) {
        trim_messages(threadId, idx);
      }

      window.dispatchEvent(new Event("stemify:chat-changed"));
    },
    [threadId],
  );

  return (
    <ChatThreadContext.Provider value={{ threadId, trimToMessage }}>
      {children}
    </ChatThreadContext.Provider>
  );
}
