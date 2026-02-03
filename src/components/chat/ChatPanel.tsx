"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { History, Plus, Settings, Pencil, Check, X, Copy } from "lucide-react";

import { Thread } from "@/components/assistant-ui/thread";
import {
  ChatRuntimeProvider,
  append_to_assistant_message,
  create_message_id,
} from "@/components/chat/ChatRuntimeProvider";
import { Button } from "@/components/ui/button";
import type { SavedScene } from "@/lib/scene/store";
import { get_thread, set_thread_title } from "@/lib/chat/store";
import { run_chat_turn } from "@/lib/chat/runner";
import { clear_banner } from "@/lib/chat/banner";
import { generate_title } from "@/lib/chat/title";
import { upsert_scene } from "@/lib/scene/store";

const format_chat_for_clipboard = (thread_id: string): string => {
  const snapshot = get_thread(thread_id);

  const format_datetime = (timestamp: number): string => {
    const iso = new Date(timestamp).toISOString();
    return iso.slice(0, 16).replace("T", " ");
  };

  const extract_model_name = (model_id: string): string => {
    const parts = model_id.split("/");
    return parts[parts.length - 1] || model_id;
  };

  return snapshot.messages
    .map((m) => {
      if (m.role === "system") {
        return `System:\n${m.content}`.trimEnd();
      }

      const header = m.role === "user" ? "User" : "Assistant";
      const meta_parts: string[] = [];

      if (m.meta?.mode) {
        meta_parts.push(m.meta.mode.toUpperCase());
      }
      if (m.meta?.model_id) {
        meta_parts.push(extract_model_name(m.meta.model_id));
      }
      if (m.created_at) {
        meta_parts.push(format_datetime(m.created_at));
      }

      const meta_line = meta_parts.length > 0 ? ` (${meta_parts.join(", ")})` : "";
      return `${header}${meta_line}:\n${m.content}`.trimEnd();
    })
    .join("\n\n---\n\n");
};

export type ChatPanelProps = {
  active_scene: SavedScene;
  on_scene_title_change?: (new_title: string) => void;
};

export function ChatPanel(props: ChatPanelProps) {
  const thread_id = props.active_scene.id;

  const abort_ref = useRef<AbortController | null>(null);
  const [is_editing_title, set_is_editing_title] = useState(false);
  const [edit_title_value, set_edit_title_value] = useState("");
  const [copied, set_copied] = useState(false);

  const current_title = useCallback(() => {
    const thread = get_thread(thread_id);
    return thread.title ?? props.active_scene.title;
  }, [props.active_scene.title, thread_id]);

  const [display_title, set_display_title] = useState("");

  useEffect(() => {
    return () => {
      abort_ref.current?.abort();
      abort_ref.current = null;
    };
  }, []);

  useEffect(() => {
    const title = current_title();
    set_display_title(title);
    set_edit_title_value(title);
  }, [current_title, thread_id]);

  const on_cancel = useCallback(async () => {
    abort_ref.current?.abort();
    abort_ref.current = null;
  }, []);

  const on_first_assistant_response = useCallback(
    async (options: { thread_id: string; first_user_message: string }) => {
      const current = get_thread(options.thread_id);
      if (current.title) return;

      try {
        const title = await generate_title(options.first_user_message);
        set_thread_title(options.thread_id, title);
        set_display_title(title);
      } catch {
        // Title generation failed silently
      }
    },
    [],
  );

  const on_send_user_message = useCallback(
    async (options: {
      thread_id: string;
      user_text: string;
      mode: "ask" | "build";
      model_id: string | undefined;
      on_first_delta: (assistant_message_id: string) => void;
    }) => {
      clear_banner();
      abort_ref.current?.abort();
      const controller = new AbortController();
      abort_ref.current = controller;

      let assistant_message_id: string | null = null;

      try {
        const snapshot = get_thread(options.thread_id);
        const history = snapshot.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

        await run_chat_turn({
          thread_id: options.thread_id,
          scene: props.active_scene,
          history,
          user_text: options.user_text,
          mode: options.mode,
          on_delta: (delta) => {
            if (assistant_message_id === null) {
              assistant_message_id = create_message_id("msg_assistant");
              options.on_first_delta(assistant_message_id!);
            }
            append_to_assistant_message({
              thread_id: options.thread_id,
              assistant_message_id,
              delta,
            });
            return assistant_message_id;
          },
          signal: controller.signal,
        });
      } finally {
        if (abort_ref.current === controller) {
          abort_ref.current = null;
        }
      }
    },
    [props.active_scene],
  );

  const start_editing_title = useCallback(() => {
    set_edit_title_value(display_title);
    set_is_editing_title(true);
  }, [display_title]);

  const cancel_editing_title = useCallback(() => {
    set_edit_title_value(display_title);
    set_is_editing_title(false);
  }, [display_title]);

  const save_title = useCallback(() => {
    const trimmed = edit_title_value.trim();
    if (trimmed && trimmed !== display_title) {
      set_thread_title(thread_id, trimmed);
      set_display_title(trimmed);
      upsert_scene({
        ...props.active_scene,
        title: trimmed,
      });
      window.dispatchEvent(new CustomEvent("stemify:scenes-changed", { detail: { activeId: props.active_scene.id } }));
    }
    set_is_editing_title(false);
  }, [edit_title_value, display_title, thread_id, props.active_scene]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-2">
        {is_editing_title ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              type="text"
              value={edit_title_value}
              onChange={(e) => set_edit_title_value(e.target.value)}
              className="flex-1 bg-transparent text-sm font-medium text-white/80 outline-none min-w-0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  save_title();
                } else if (e.key === "Escape") {
                  cancel_editing_title();
                }
              }}
            />
            <Button
              type="button"
              variant="toolbar"
              size="icon"
              className="h-7 w-7 transition-all duration-200"
              onClick={save_title}
              title="Save"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="toolbar"
              size="icon"
              className="h-7 w-7 transition-all duration-200"
              onClick={cancel_editing_title}
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <div
                className="truncate text-sm font-medium text-white/80 cursor-pointer hover:text-white transition-colors"
                onClick={start_editing_title}
              >
                {display_title}
              </div>
              <Button
                type="button"
                variant="toolbar"
                size="icon"
                className="h-7 w-7 transition-all duration-200"
                onClick={start_editing_title}
                title="Edit title"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="toolbar"
                size="icon"
                className="h-7 w-7 transition-all duration-200"
                onClick={() => {
                  window.dispatchEvent(new Event("stemify:new-scene"));
                }}
                title="New scene"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="toolbar"
                size="icon"
                className="h-7 w-7 transition-all duration-200"
                onClick={() => {
                  const text = format_chat_for_clipboard(thread_id);
                  navigator.clipboard.writeText(text);
                  set_copied(true);
                  setTimeout(() => set_copied(false), 1500);
                }}
                title="Copy conversation"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="toolbar"
                size="icon"
                className="h-7 w-7 transition-all duration-200"
                onClick={() => {
                  window.dispatchEvent(new Event("stemify:open-history"));
                }}
                title="Scene history"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="toolbar"
                size="icon"
                className="h-7 w-7 transition-all duration-200"
                onClick={() => {
                  window.dispatchEvent(new Event("stemify:open-settings"));
                }}
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <ChatRuntimeProvider
          thread_id={thread_id}
          on_send_user_message={on_send_user_message}
          on_cancel={on_cancel}
          on_first_assistant_response={on_first_assistant_response}
        >
          <Thread />
        </ChatRuntimeProvider>
      </div>
    </div>
  );
}
