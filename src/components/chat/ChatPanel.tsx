"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";

import { Thread } from "@/components/assistant-ui/thread";
import {
  ChatRuntimeProvider,
  append_to_assistant_message,
  create_message_id,
} from "@/components/chat/ChatRuntimeProvider";
import { Button } from "@/components/ui/button";
import type { SavedScene } from "@/lib/scene/store";
import { get_thread } from "@/lib/chat/store";
import { run_chat_turn } from "@/lib/chat/runner";

export type ChatPanelProps = {
  active_scene: SavedScene;
};

export function ChatPanel(props: ChatPanelProps) {
  const thread_id = props.active_scene.id;
  const [copied, set_copied] = useState(false);

  const copy_chat_to_clipboard = useCallback(async () => {
    const snapshot = get_thread(thread_id);

    const out = snapshot.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => {
        const header = m.role === "user" ? "User" : "Assistant";
        return `${header}:\n${m.content}`.trimEnd();
      })
      .join("\n\n---\n\n");

    await navigator.clipboard.writeText(out);
    set_copied(true);
    setTimeout(() => set_copied(false), 1500);
  }, [thread_id]);

  const abort_ref = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abort_ref.current?.abort();
      abort_ref.current = null;
    };
  }, []);

  const on_cancel = useCallback(async () => {
    abort_ref.current?.abort();
    abort_ref.current = null;
  }, []);

  const on_send_user_message = useCallback(
    async (options: {
      thread_id: string;
      user_text: string;
      mode: "ask" | "build";
      model_id: string | undefined;
      on_first_delta: (assistant_message_id: string) => void;
    }) => {
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
              options.on_first_delta(assistant_message_id);
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
        <div className="text-sm font-medium text-white/80 truncate">
          {props.active_scene.title}
        </div>

        <Button
          type="button"
          variant="toolbar"
          size="icon"
          className="h-7 w-7 transition-all duration-200"
          onClick={() => {
            void copy_chat_to_clipboard();
          }}
          title={copied ? "Copied!" : "Copy chat"}
        >
          {copied ? (
            <Check className="h-4 w-4 text-white/80" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <ChatRuntimeProvider
          thread_id={thread_id}
          on_send_user_message={on_send_user_message}
          on_cancel={on_cancel}
        >
          <Thread />
        </ChatRuntimeProvider>
      </div>
    </div>
  );
}
