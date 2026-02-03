"use client";

import { useCallback, useEffect, useRef } from "react";
import { History, Plus, Settings } from "lucide-react";

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
import { clear_banner } from "@/lib/chat/banner";

export type ChatPanelProps = {
  active_scene: SavedScene;
};

export function ChatPanel(props: ChatPanelProps) {
  const thread_id = props.active_scene.id;

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-2">
        <div className="text-sm font-medium text-white/80 truncate">
          {props.active_scene.title}
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
