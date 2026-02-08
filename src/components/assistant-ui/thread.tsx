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

import { MarkdownText, CodeHeader } from "@/components/assistant-ui/markdown-text";
import { ChatStatusBanner } from "@/components/chat/ChatStatusBanner";
import { RecentScenes } from "@/components/chat/RecentScenes";
import { OpenRouterModelSelector } from "@/components/openrouter/OpenRouterModelSelector";
import { Button } from "@/components/ui/button";
import { KeyboardShortcut } from "@/components/ui/keyboard-shortcut";
import { load_chat_mode, save_chat_mode, type ChatMode } from "@/lib/chat/mode";
import { useChatPrerequisites } from "@/lib/chat/prerequisites";

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
};

export const Thread: FC<ThreadProps> = ({ show_recent_scenes }) => {
  const viewport_ref = useRef<HTMLDivElement>(null);
  useChatPrerequisites();

  return (
    <>
      {SCROLLBAR_STYLES}
      <ThreadPrimitive.Root className="relative flex h-full min-h-0 flex-col">
        <ThreadPrimitive.Viewport ref={viewport_ref} className="relative flex min-h-0 flex-1 flex-col overflow-y-scroll px-4 pt-4 chat-scroll-viewport">
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
            }}
          />
        </ThreadPrimitive.Viewport>

        {show_recent_scenes && (
          <div className="w-full max-w-2xl mx-auto p-4">
            <RecentScenes />
          </div>
        )}

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-2xl flex-col gap-4 overflow-visible rounded-t-3xl bg-zinc-950/90 px-4 pb-4 pt-2 backdrop-blur">
          <ThreadScrollToBottom viewportRef={viewport_ref} />
          <ChatStatusBanner />
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Root>
    </>
  );
};

const ThreadScrollToBottom: FC<{ viewportRef: React.RefObject<HTMLDivElement | null> }> = ({ viewportRef }) => {
  const [show_button, set_show_button] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const check_scroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const distance_from_bottom = scrollHeight - clientHeight - scrollTop;
      set_show_button(distance_from_bottom > 100);
    };

    check_scroll();
    viewport.addEventListener("scroll", check_scroll);
    return () => viewport.removeEventListener("scroll", check_scroll);
  }, [viewportRef]);

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

    window.addEventListener("stemify:model-selector-closed", handle_model_selector_closed);
    return () => {
      window.removeEventListener("stemify:model-selector-closed", handle_model_selector_closed);
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
            className="h-8 min-w-8 gap-2 px-3 text-xs font-semibold uppercase tracking-wide border-0 shrink-0 justify-between cursor-pointer rounded-lg"
            style={{ backgroundColor: "#f97316", color: "white" }}
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
  const date = new Date(timestamp);
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const time = date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  return `${month} ${day}, ${time}`;
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
      className="mx-auto w-full max-w-2xl pb-2"
      data-role="user"
    >
      <div className="px-2">
        <div className="group">
          <div className="ml-auto w-fit max-w-[85%] rounded-2xl bg-white/10 px-4 py-2 text-sm text-primary">
            <MessagePrimitive.Parts />
          </div>
          {show_meta && (
            <div className="mt-0.5 flex justify-end pr-4 opacity-0 group-hover:opacity-100">
              <span className="text-[10px] font-medium tracking-wide text-muted">
                {mode === "ask" ? "ASK" : "BUILD"}
                {model_name && ` • ${model_name}`}
                {time_str && ` • ${time_str}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

// Custom Text component that wraps build mode JSON in code blocks
const AssistantText: FC = () => {
  const mode = useMessage(
    (m) => m.metadata?.custom?.stemify_mode as "ask" | "build" | undefined,
  );
  const content = useMessage((m) => m.content as unknown as Array<{ type: string; text: string }> | undefined);
  
  // If in build mode and content looks like JSON, wrap it in a code block
  if (mode === "build" && content && content.length > 0) {
    const fullText = content[0]?.text || "";
    
    // Extract JSON code portion (between ```json and ``` fences)
    const codeBlockMatch = fullText.match(/```json\n([\s\S]*?)\n```/);
    const jsonText = codeBlockMatch ? codeBlockMatch[1].trim() : fullText.split(/\n\n/)[0].trim();
    
    // Check if this is JSON content
    const isJson = fullText.includes("```json") || fullText.trim().startsWith("{");
    
    if (isJson) {
      return (
        <div className="aui-md select-text">
          <CodeHeader language="json" code={jsonText} />
          <pre className="overflow-x-auto rounded-b-2xl border border-white/5 border-t-0 bg-white/3 p-3 text-xs leading-relaxed select-text">
            <code className="language-json">{jsonText}</code>
          </pre>
        </div>
      );
    }
  }
  
  // Default: use regular MarkdownText
  return <MarkdownText />;
};

const AssistantMessage: FC = () => {
  const mode = useMessage(
    (m) => m.metadata?.custom?.stemify_mode as "ask" | "build" | undefined,
  );
  const model_id = useMessage(
    (m) => m.metadata?.custom?.model_id as string | undefined,
  );
  const created_at = useMessage((m) => m.createdAt as Date | undefined);
  const content = useMessage((m) => m.content as unknown as Array<{ type: string; text: string }> | undefined);

  const model_name = extract_model_name(model_id);
  const time_str = created_at
    ? format_message_time(created_at.getTime())
    : null;

  const show_meta = mode && (mode === "ask" || mode === "build");

  const is_build_json = mode === "build" && content && content.length > 0 &&
    content[0]?.text?.trim().startsWith("{") && !content[0]?.text?.includes("```");

  const has_content = content && (content.length > 1 || (content.length === 1 && (content[0].type !== "text" || content[0].text.length > 0)));

  return (
    <MessagePrimitive.Root
      className="mx-auto w-full max-w-2xl pb-2"
      data-role="assistant"
    >
      {!has_content ? (
        <div className="flex items-center gap-1.5 py-1 pl-4">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs text-zinc-500">Thinking...</span>
        </div>
      ) : (
        <div className="px-2">
          <div className="group">
            <div className="w-full px-4 pt-2 pb-0 text-sm text-primary">
              {is_build_json ? (
                <AssistantText />
              ) : (
                <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
              )}
            </div>

            {show_meta && (
              <div className="mt-0.5 flex px-4 opacity-0 group-hover:opacity-100">
                <span className="text-[10px] font-medium tracking-wide text-muted">
                  {mode === "ask" ? "ASK" : "BUILD"}
                  {model_name && ` • ${model_name}`}
                  {time_str && ` • ${time_str}`}
                </span>
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
