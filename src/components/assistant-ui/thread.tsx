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

import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ChatStatusBanner } from "@/components/chat/ChatStatusBanner";
import { RecentScenes } from "@/components/chat/RecentScenes";
import { OpenRouterModelSelector } from "@/components/openrouter/OpenRouterModelSelector";
import { useChatThread } from "@/components/chat/ChatRuntimeProvider";
import { Button } from "@/components/ui/button";
import { KeyboardShortcut } from "@/components/ui/keyboard-shortcut";
import { load_chat_mode, save_chat_mode, type ChatMode } from "@/lib/chat/mode";
import { useChatPrerequisites } from "@/lib/chat/prerequisites";
import { useEffect, useRef, useState, type FC } from "react";
import { format_relative_date } from "@/lib/utils";

const SCROLLBAR_STYLES = (
  <style>{`
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    .animate-bounce {
      animation: bounce 0.6s ease-in-out infinite;
    }
  `}</style>
);

export type ThreadProps = {
  show_recent_scenes?: boolean;
  thread_id?: string | null;
};

export const Thread: FC<ThreadProps> = ({ show_recent_scenes, thread_id }) => {
  const viewport_ref = useRef<HTMLDivElement>(null);
  useChatPrerequisites();

  return (
    <>
      {SCROLLBAR_STYLES}
      <ThreadPrimitive.Root className="relative flex h-full min-h-0 flex-col">
        <ThreadPrimitive.Viewport
          ref={viewport_ref}
          className="relative flex min-h-0 flex-1 flex-col overflow-y-scroll px-4 pt-4 chat-scroll-viewport"
        >
          <AuiIf condition={({ thread }) => thread.isEmpty}>
            {!show_recent_scenes && (
              <div className="mx-auto my-auto max-w-md text-center">
                <div className="text-sm font-semibold text-secondary">
                  Ask a question
                </div>
                <div className="mt-2 text-sm leading-6 text-tertiary">
                  Ask for an explanation, or ask to update the visualization.
                </div>
              </div>
            )}
          </AuiIf>

          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
              EditComposer,
            }}
          />

          {show_recent_scenes && (
            <div className="mt-auto pt-4">
              <RecentScenes />
            </div>
          )}
        </ThreadPrimitive.Viewport>

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-2xl flex-col gap-4 overflow-visible rounded-t-3xl bg-(--main-black)/90 px-4 pb-4 pt-2 backdrop-blur">
          <ThreadScrollToBottom viewportRef={viewport_ref} thread_id={thread_id} />
          <ChatStatusBanner />
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Root>
    </>
  );
};

const ThreadScrollToBottom: FC<{
  viewportRef: React.RefObject<HTMLDivElement | null>;
  thread_id?: string | null;
}> = (props) => {
  const { viewportRef, thread_id } = props;
  const [show_button, set_show_button] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.scrollTop = viewport.scrollHeight;

    const check_scroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const distance_from_bottom = scrollHeight - clientHeight - scrollTop;
      set_show_button(distance_from_bottom > 100);
    };

    check_scroll();
    viewport.addEventListener("scroll", check_scroll);
    return () => viewport.removeEventListener("scroll", check_scroll);
  }, [viewportRef, thread_id]);

  if (!show_button) return null;

  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute -top-12 z-10 self-center rounded-full p-4 h-10 w-10 border-white/5 bg-zinc-900/90 text-white/80 backdrop-blur hover:bg-zinc-800"
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
  const [show_keyboard_shortcut, set_show_keyboard_shortcut] = useState(true);
  const input_ref = useRef<HTMLTextAreaElement>(null);
  const composer_ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!composer_ref.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        set_show_keyboard_shortcut(width >= 300);
      }
    });

    observer.observe(composer_ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handle_model_selector_closed = () => {
      setTimeout(() => {
        input_ref.current?.focus();
      }, 50);
    };

    window.addEventListener(
      "stemify:model-selector-closed",
      handle_model_selector_closed,
    );
    return () => {
      window.removeEventListener(
        "stemify:model-selector-closed",
        handle_model_selector_closed,
      );
    };
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
    : `${base_placeholder} ${mod_key}K`;

  return (
    <ComposerPrimitive.Root
      className="rounded-outer border border-white/5 bg-white/3 p-2"
      onSubmit={() => {
        aui.composer().setRunConfig({ custom: { stemify_mode: mode } });
      }}
    >
      <div ref={composer_ref}>
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
            if (
              e.key === "Tab" &&
              !e.shiftKey &&
              !e.altKey &&
              !e.ctrlKey &&
              !e.metaKey
            ) {
              e.preventDefault();
              trigger_mode_toggle_feedback();
              toggle_mode();
            }
          }}
          className="mb-2 min-h-10 w-full max-h-40 resize-none overflow-y-auto bg-transparent px-2 text-sm text-primary outline-none placeholder:text-placeholder"
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
              showKeyboardShortcut={show_keyboard_shortcut}
            />
          </div>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

const ModeToggle: FC<{
  mode: ChatMode;
  onToggle: () => void;
  isInputFocused: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  isActive: boolean;
  onTriggerFeedback: () => void;
  showKeyboardShortcut: boolean;
}> = ({
  mode,
  onToggle,
  isInputFocused,
  inputRef,
  isActive,
  onTriggerFeedback,
  showKeyboardShortcut,
}) => {
  const active_label = mode === "ask" ? "ASK" : "BUILD";

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onTriggerFeedback();
    onToggle();
    // Always refocus input after toggle
    inputRef.current?.focus();
  };

  const getSubmitButtonStyles = () => {
    const base = "h-8 min-w-8 gap-2 px-3 text-xs font-semibold uppercase tracking-wide border-2 shrink-0 justify-between cursor-pointer rounded-lg";

    if (mode === "ask") {
      return `${base} bg-transparent text-amber-400 border-amber-400 hover:bg-amber-400/10`;
    }
    return `${base} bg-amber-400 text-black border-amber-400 hover:bg-amber-500`;
  };

  const getCancelButtonStyles = () => {
    const base = "h-8 min-w-8 gap-2 px-3 text-xs font-semibold uppercase tracking-wide border-0 shrink-0 justify-between cursor-pointer rounded-lg";

    if (mode === "ask") {
      return `${base} bg-transparent text-amber-400 border-2 border-amber-400`;
    }
    return `${base} bg-amber-400 text-black border-2 border-amber-400`;
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
        {showKeyboardShortcut && (
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
        )}
        <div className="flex flex-col justify-center gap-1">
          <div
            className="h-1 w-1 rounded-full transition-all duration-200 group-hover:scale-125"
            style={{
              backgroundColor:
                mode === "ask"
                  ? "#fbbf24"
                  : "rgba(255,255,255,0.3)",
            }}
          />
          <div
            className="h-1 w-1 rounded-full transition-all duration-200 group-hover:scale-125"
            style={{
              backgroundColor:
                mode === "build"
                  ? "#fbbf24"
                  : "rgba(255,255,255,0.3)",
            }}
          />
        </div>
      </button>

      <AuiIf condition={({ thread }) => !thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <Button
            type="submit"
            size="sm"
            className={getSubmitButtonStyles()}
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
            className={getCancelButtonStyles()}
          >
            <span className="text-left">Stop</span>
            <Square className="h-3.5 w-3.5 shrink-0" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

function format_message_time(timestamp: number): string {
  return format_relative_date(timestamp);
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
  const role = useMessage((m) => m.role);
  const model_id = useMessage(
    (m) => m.metadata?.custom?.model_id as string | undefined,
  );
  const created_at = useMessage((m) => m.createdAt as Date | undefined);
  const message_id = useMessage((m) => m.id);
  const { trimToMessage } = useChatThread() ?? {};

  const model_name = extract_model_name(model_id);
  const time_str = created_at
    ? format_message_time(created_at.getTime())
    : null;

  const show_meta = mode && (mode === "ask" || mode === "build");
  const is_user = role === "user";

  const handle_delete = () => {
    trimToMessage?.(message_id);
  };

  return (
    <MessagePrimitive.Root
      className="mx-auto w-full max-w-2xl pb-2"
      data-role="user"
    >
      <div className="px-2">
        <div className="group">
          <div className="ml-auto max-w-[85%] rounded-2xl bg-white/10 px-4 py-2 text-sm text-primary break-words">
            <MessagePrimitive.Parts />
          </div>
          {show_meta && (
            <div className="mt-1 flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100">
              <ActionBarPrimitive.Root className="flex items-center gap-1.5 text-[10px] text-white/60">
                {is_user && (
                  <>
                    <ActionBarPrimitive.Edit asChild>
                      <span className="cursor-pointer rounded px-0.5 py-0.5 hover:text-white/90">Edit</span>
                    </ActionBarPrimitive.Edit>
                    <span>•</span>
                  </>
                )}
                <button
                  type="button"
                  className="cursor-pointer rounded px-0.5 py-0.5 hover:text-white/90"
                  onClick={handle_delete}
                >
                  Delete
                </button>
                <span>•</span>
                <span className="font-medium tracking-wide text-white/60">
                  {mode === "ask" ? "ASK" : "BUILD"}
                  {model_name && ` • ${model_name}`}
                  {time_str && ` • ${time_str}`}
                </span>
              </ActionBarPrimitive.Root>
            </div>
          )}
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  const mode = useMessage(
    (m) =>
      m.metadata?.custom?.stemify_mode as "ask" | "build" | "fix" | undefined,
  );
  const model_id = useMessage(
    (m) => m.metadata?.custom?.model_id as string | undefined,
  );
  const created_at = useMessage((m) => m.createdAt as Date | undefined);
  const content = useMessage(
    (m) =>
      m.content as unknown as Array<{ type: string; text: string }> | undefined,
  );

  const has_content =
    content &&
    (content.length > 1 ||
      (content.length === 1 &&
        (content[0].type !== "text" || content[0].text.length > 0)));

  const model_name = extract_model_name(model_id);
  const time_str = created_at
    ? format_message_time(created_at.getTime())
    : null;

  const show_meta =
    mode && (mode === "ask" || mode === "build" || mode === "fix");

  return (
    <MessagePrimitive.Root
      className="mx-auto w-full max-w-2xl pb-2"
      data-role="assistant"
    >
      {!has_content ? (
        <div className="flex items-center gap-1.5 py-1 pl-4">
          <div className="flex gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <span className="text-xs text-zinc-500">{"Cooking..."}</span>
        </div>
      ) : (
        <div className="px-2">
          <div className="group">
            <div className="w-full px-4 pb-0 text-sm text-primary break-words">
              <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
            </div>

            {show_meta && (
              <div className="mt-1 flex items-center px-4 opacity-0 group-hover:opacity-100">
                <ActionBarPrimitive.Root className="flex items-center gap-1.5 text-[10px] text-white/60">
                  <span className="font-medium tracking-wide">
                    {mode === "ask" ? "ASK" : mode === "build" ? "BUILD" : "FIX"}
                    {model_name && ` • ${model_name}`}
                    {time_str && ` • ${time_str}`}
                  </span>
                </ActionBarPrimitive.Root>
              </div>
            )}
          </div>
        </div>
      )}

      <MessagePrimitive.Error>
        <div className="mt-2 rounded-md border border-amber-400/20 bg-amber-500/10 px-2 py-2 text-sm text-amber-100">
          <ErrorPrimitive.Message />
        </div>
        <div className="mt-2 flex justify-end pr-2">
          <ActionBarPrimitive.Reload asChild>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-md border-white/5"
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

const EditComposer: FC = () => {
  const message_mode = useMessage(
    (m) => m.metadata?.custom?.stemify_mode as "ask" | "build" | undefined,
  );

  const getSendButtonStyles = () => {
    const base = "h-8 min-w-8 gap-2 px-3 text-xs font-semibold uppercase tracking-wide border-2 shrink-0 justify-between cursor-pointer rounded-lg";

    if (message_mode === "build") {
      return `${base} bg-amber-400 text-black border-amber-400 hover:bg-amber-500`;
    }
    return `${base} bg-transparent text-amber-400 border-amber-400 hover:bg-amber-400/10`;
  };

  const sendLabel = message_mode === "build" ? "BUILD" : "ASK";

  return (
    <MessagePrimitive.Root className="mx-auto w-full max-w-2xl pb-2" data-role="user">
      <div className="px-2">
        <ComposerPrimitive.Root className="rounded-outer border border-white/5 bg-white/3 p-2">
          <ComposerPrimitive.Input
            className="mb-2 min-h-10 w-full max-h-40 resize-none overflow-y-auto bg-transparent px-2 text-sm text-primary outline-none placeholder:text-placeholder"
            autoFocus
            submitOnEnter={true}
          />
          <div className="flex items-center justify-end gap-2">
            <ComposerPrimitive.Cancel asChild>
              <Button
                type="button"
                size="sm"
                className="h-8 min-w-8 gap-2 px-3 text-xs font-semibold uppercase tracking-wide border-0 shrink-0 justify-between cursor-pointer rounded-lg bg-transparent text-white/60 border-2 border-white/10 hover:bg-white/5"
              >
                Cancel
              </Button>
            </ComposerPrimitive.Cancel>
            <ComposerPrimitive.Send asChild>
              <Button
                type="button"
                size="sm"
                className={getSendButtonStyles()}
              >
                <span className="text-left">{sendLabel}</span>
                <ArrowUp className="h-3.5 w-3.5 shrink-0" />
              </Button>
            </ComposerPrimitive.Send>
          </div>
        </ComposerPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
};
