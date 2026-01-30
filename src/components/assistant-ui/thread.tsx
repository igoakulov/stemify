"use client";

import {
  ActionBarPrimitive,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useMessage,
} from "@assistant-ui/react";
import { useAui } from "@assistant-ui/store";
import { ArrowDownIcon, ArrowUp, RotateCcwIcon, Square } from "lucide-react";
import { useEffect, useRef, useState, type FC } from "react";

import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ChatStatusBanner } from "@/components/chat/ChatStatusBanner";
import { OpenRouterModelSelector } from "@/components/openrouter/OpenRouterModelSelector";
import { Button } from "@/components/ui/button";
import { KeyboardShortcut } from "@/components/ui/keyboard-shortcut";
import { load_chat_mode, save_chat_mode, type ChatMode } from "@/lib/chat/mode";
import { useChatPrerequisites } from "@/lib/chat/prerequisites";

export const Thread: FC = () => {
  useChatPrerequisites();

  return (
    <ThreadPrimitive.Root className="flex h-full min-h-0 flex-col">
      <ThreadPrimitive.Viewport className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4">
        <AuiIf condition={({ thread }) => thread.isEmpty}>
          <div className="mx-auto my-auto max-w-md text-center">
            <div className="text-base font-semibold text-secondary">
              Ask a question
            </div>
            <div className="mt-2 text-sm leading-6 text-tertiary">
              Ask for an explanation, or ask to update the visualization.
            </div>
          </div>
        </AuiIf>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />

        <ThreadScrollToBottom />

        <ThreadPrimitive.ViewportFooter className="mt-auto flex flex-col gap-3 bg-zinc-950/70 pb-4 pt-2 backdrop-blur">
          <ChatStatusBanner />
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute bottom-20 right-4 z-10 mx-auto h-9 w-9 rounded-full border-white/5 bg-zinc-900/90 text-white/80 backdrop-blur hover:bg-zinc-800 disabled:hidden"
        aria-label="Scroll to bottom"
      >
        <ArrowDownIcon className="h-4 w-4" />
      </Button>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const Composer: FC = () => {
  const aui = useAui();
  const [mode, set_mode] = useState<ChatMode>("ask");
  const [is_focused, set_is_focused] = useState(false);
  const [is_mode_toggle_active, set_is_mode_toggle_active] = useState(false);
  const input_ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      set_mode(load_chat_mode());
    });

    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const handle_keydown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus input
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        input_ref.current?.focus();
      }
    };

    window.addEventListener("keydown", handle_keydown);
    return () => window.removeEventListener("keydown", handle_keydown);
  }, []);

  const trigger_mode_toggle_feedback = () => {
    set_is_mode_toggle_active(true);
    setTimeout(() => set_is_mode_toggle_active(false), 150);
  };

  const toggle_mode = () => {
    const next: ChatMode = mode === "ask" ? "build" : "ask";
    set_mode(next);
    save_chat_mode(next);
  };

  const is_mac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const mod_key = is_mac ? "⌘" : "⌃";

  const base_placeholder =
    mode === "build" ? "Describe scene..." : "Ask a question...";

  const placeholder = is_focused
    ? base_placeholder
    : `${base_placeholder} (${mod_key}K)`;

  return (
    <ComposerPrimitive.Root
      className="rounded-2xl border border-white/5 bg-white/3 p-2"
      onSubmit={() => {
        aui.composer().setRunConfig({ custom: { stemify_mode: mode } });
      }}
    >
      <ComposerPrimitive.Input
        ref={input_ref}
        placeholder={placeholder}
        onFocus={() => set_is_focused(true)}
        onBlur={() => set_is_focused(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            input_ref.current?.blur();
          }
          if (e.key === "Tab" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            trigger_mode_toggle_feedback();
            toggle_mode();
          }
        }}
        className="mb-2 min-h-10 w-full resize-none bg-transparent px-2 text-sm text-primary outline-none placeholder:text-placeholder"
        rows={1}
      />

      <div className="flex items-center gap-2">
        <div className="flex items-center">
          <OpenRouterModelSelector />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ModeToggle 
            mode={mode} 
            onToggle={toggle_mode} 
            isInputFocused={is_focused} 
            inputRef={input_ref} 
            isActive={is_mode_toggle_active}
            onTriggerFeedback={trigger_mode_toggle_feedback}
          />
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const ModeToggle: FC<{ mode: ChatMode; onToggle: () => void; isInputFocused: boolean; inputRef: React.RefObject<HTMLTextAreaElement | null>; isActive: boolean; onTriggerFeedback: () => void }> = ({
  mode,
  onToggle,
  isInputFocused,
  inputRef,
  isActive,
  onTriggerFeedback,
}) => {
  const active_label = mode === "ask" ? "ASK" : "BUILD";

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onTriggerFeedback();
    onToggle();
    // Always refocus input after toggle
    inputRef.current?.focus();
  };

  return (
    <div className="group flex items-center gap-1">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleButtonClick}
        className="flex items-center gap-2 h-8 px-2 rounded transition-colors cursor-pointer"
        aria-label={`Switch to ${mode === "ask" ? "build" : "ask"} mode`}
      >
        <KeyboardShortcut
          keys={["tab"]}
          onTrigger={() => {
            onTriggerFeedback();
            onToggle();
          }}
          enabled={isInputFocused}
          disableOnInput={false}
          asChild
          forceActive={isActive}
        />
        <div className="flex flex-col justify-center gap-1">
          <div
            className="h-1 w-1 rounded-full transition-all duration-200 group-hover:scale-125"
            style={{
              backgroundColor:
                mode === "ask" ? "#f97316" : "rgba(255,255,255,0.3)",
            }}
          />
          <div
            className="h-1 w-1 rounded-full transition-all duration-200 group-hover:scale-125"
            style={{
              backgroundColor:
                mode === "build" ? "#f97316" : "rgba(255,255,255,0.3)",
            }}
          />
        </div>
      </button>

      <AuiIf condition={({ thread }) => !thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <Button
            type="submit"
            size="sm"
            className="h-8 min-w-8 gap-2 px-3 text-xs font-semibold uppercase tracking-wide border-0 shrink-0 justify-between cursor-pointer rounded-lg"
            style={{ backgroundColor: "#f97316", color: "white" }}
          >
            <span className="text-left">{active_label}</span>
            <ArrowUp className="h-3.5 w-3.5 shrink-0" />
          </Button>
        </ComposerPrimitive.Send>
      </AuiIf>

      <AuiIf condition={({ thread }) => thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-full p-0 cursor-pointer"
            variant="secondary"
          >
            <Square className="h-4 w-4" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

function format_message_time(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function extract_model_name(model_id: string | undefined): string | null {
  if (!model_id) return null;
  const parts = model_id.split("/");
  return parts[parts.length - 1] || model_id;
}

const UserMessage: FC = () => {
  const mode = useMessage(
    (m) => m.metadata?.custom?.stemify_mode as "ask" | "build" | undefined,
  );
  const model_id = useMessage(
    (m) => m.metadata?.custom?.model_id as string | undefined,
  );
  const created_at = useMessage((m) => m.createdAt as Date | undefined);

  const model_name = extract_model_name(model_id);
  const time_str = created_at
    ? format_message_time(created_at.getTime())
    : null;

  const show_meta = mode && (mode === "ask" || mode === "build");

  return (
    <MessagePrimitive.Root
      className="group mx-auto w-full max-w-2xl py-3"
      data-role="user"
    >
      <div className="relative ml-auto w-fit max-w-[85%] rounded-lg bg-white/10 px-4 py-2 text-sm text-primary">
        <MessagePrimitive.Parts />
      </div>
      {show_meta && (
        <div className="mt-1 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-[10px] font-medium tracking-wide text-muted">
            {mode === "ask" ? "ASK" : "BUILD"}
            {model_name && ` • ${model_name}`}
            {time_str && ` • ${time_str}`}
          </span>
        </div>
      )}
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  const mode = useMessage(
    (m) => m.metadata?.custom?.stemify_mode as "ask" | "build" | undefined,
  );
  const model_id = useMessage(
    (m) => m.metadata?.custom?.model_id as string | undefined,
  );
  const created_at = useMessage((m) => m.createdAt as Date | undefined);

  const model_name = extract_model_name(model_id);
  const time_str = created_at
    ? format_message_time(created_at.getTime())
    : null;

  const show_meta = mode && (mode === "ask" || mode === "build");

  return (
    <MessagePrimitive.Root
      className="group mx-auto w-full max-w-2xl py-3"
      data-role="assistant"
    >
      <div className="w-full rounded-lg bg-white/5 px-4 py-2 text-sm text-primary">
        <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
      </div>

      {show_meta && (
        <div className="mt-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-[10px] font-medium tracking-wide text-muted">
            {mode === "ask" ? "ASK" : "BUILD"}
            {model_name && ` • ${model_name}`}
            {time_str && ` • ${time_str}`}
          </span>
        </div>
      )}

      <MessagePrimitive.Error>
        <div className="mt-2 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          <ErrorPrimitive.Message />
        </div>
        <div className="mt-2 flex justify-end">
          <ActionBarPrimitive.Reload asChild>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-lg border-white/5"
            >
              <RotateCcwIcon className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </ActionBarPrimitive.Reload>
        </div>
      </MessagePrimitive.Error>
    </MessagePrimitive.Root>
  );
};
