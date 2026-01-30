"use client";

import {
  AssistantRuntimeProvider,
  type AppendMessage,
  type ThreadMessageLike,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { useCallback, useSyncExternalStore } from "react";

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

type ChatRuntimeProviderProps = {
  thread_id: ChatThreadId;
  children: React.ReactNode;
  on_send_user_message: (options: {
    thread_id: ChatThreadId;
    user_text: string;
    mode: "ask" | "build";
    model_id: string | undefined;
    on_first_delta: (assistant_message_id: string) => void;
  }) => Promise<void>;
  on_cancel: (options: { thread_id: ChatThreadId }) => Promise<void>;
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

export function ChatRuntimeProvider(props: ChatRuntimeProviderProps) {
  const subscribe = useCallback((on_store_change: () => void) => {
    const on_change = () => on_store_change();
    window.addEventListener("stemify:chat-changed", on_change);
    return () => window.removeEventListener("stemify:chat-changed", on_change);
  }, []);

  const get_snapshot = useCallback(() => {
    ensure_thread(props.thread_id);
    return get_thread(props.thread_id);
  }, [props.thread_id]);

  const state = useSyncExternalStore(subscribe, get_snapshot, get_snapshot);

  const setMessages = useCallback(
    (messages: readonly ChatMessage[]) => {
      set_thread(props.thread_id, { messages: [...messages], is_running: state.is_running });
      window.dispatchEvent(new Event("stemify:chat-changed"));
    },
    [props.thread_id, state.is_running],
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


      const model_id = load_openrouter_model_id() || undefined;

      const user_msg: ChatMessage = {
        id: create_message_id("msg_user"),
        role: "user",
        content: user_text,
        created_at: Date.now(),
        meta: {
          mode,
          model_id,
        },
      };
      append_message(props.thread_id, user_msg);

      set_is_running(props.thread_id, true);
      window.dispatchEvent(new Event("stemify:chat-changed"));

      try {
        await props.on_send_user_message({
          thread_id: props.thread_id,
          user_text,
          mode,
          model_id,
          on_first_delta: (assistant_message_id) => {
            const assistant_msg: ChatMessage = {
              id: assistant_message_id,
              role: "assistant",
              content: "",
              created_at: Date.now(),
              meta: {
                mode,
                model_id,
              },
            };
            append_message(props.thread_id, assistant_msg);
            window.dispatchEvent(new Event("stemify:chat-changed"));
          },
        });
      } finally {
        set_is_running(props.thread_id, false);
        window.dispatchEvent(new Event("stemify:chat-changed"));
      }
    },
    [props.on_send_user_message, props.thread_id],
  );

  const onCancel = useCallback(async () => {
    set_is_running(props.thread_id, false);
    window.dispatchEvent(new Event("stemify:chat-changed"));
    await props.on_cancel({ thread_id: props.thread_id });
  }, [props.on_cancel, props.thread_id]);

  const onReload = useCallback(
    async (parent_id: string | null) => {
      const snapshot = get_thread(props.thread_id);

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

      set_is_running(props.thread_id, true);
      window.dispatchEvent(new Event("stemify:chat-changed"));

      try {
        await props.on_send_user_message({
          thread_id: props.thread_id,
          user_text,
          mode,
          model_id: undefined,
          on_first_delta: (assistant_message_id) => {
            const assistant_msg: ChatMessage = {
              id: assistant_message_id,
              role: "assistant",
              content: "",
              created_at: Date.now(),
              meta: {
                mode,
                model_id: undefined,
              },
            };
            append_message(props.thread_id, assistant_msg);
            window.dispatchEvent(new Event("stemify:chat-changed"));
          },
        });
      } finally {
        set_is_running(props.thread_id, false);
        window.dispatchEvent(new Event("stemify:chat-changed"));
      }
    },
    [props.on_send_user_message, props.thread_id],
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

  return <AssistantRuntimeProvider runtime={runtime}>{props.children}</AssistantRuntimeProvider>;
}

export function append_to_assistant_message(options: {
  thread_id: ChatThreadId;
  assistant_message_id: string;
  delta: string;
}) {
  update_message_content(options.thread_id, options.assistant_message_id, options.delta);
  window.dispatchEvent(new Event("stemify:chat-changed"));
}
