"use client";

import { useCallback, useEffect, useState } from "react";
import {
  History,
  Plus,
  Settings,
  Pencil,
  Check,
  X,
  Copy,
  Code2,
} from "lucide-react";

import { Thread } from "@/components/assistant-ui/thread";
import {
  ChatRuntimeProvider,
  append_to_assistant_message,
  create_message_id,
  type ResolvedThread,
} from "@/components/chat/ChatRuntimeProvider";
import { Button } from "@/components/ui/button";
import type { SavedScene } from "@/lib/scene/store";
import {
  get_thread,
  get_current_abort_controller,
  set_current_abort_controller,
} from "@/lib/chat/store";
import type { ChatMessage } from "@/lib/chat/types";
import { run_chat_turn } from "@/lib/chat/runner";
import { clear_banner } from "@/lib/chat/banner";
import { generate_title } from "@/lib/chat/title";
import {
  upsert_scene,
  save_saved_scenes,
  load_saved_scenes,
  set_active_scene_id,
} from "@/lib/scene/store";

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

      const meta_line =
        meta_parts.length > 0 ? ` (${meta_parts.join(", ")})` : "";
      return `${header}${meta_line}:\n${m.content}`.trimEnd();
    })
    .join("\n\n---\n\n");
};

export type ChatPanelProps = {
  active_scene: SavedScene | null;
  on_scene_title_change?: (new_title: string) => void;
  onSceneEditorToggle?: () => void;
  showSceneEditorButton?: boolean;
  isSceneEditorOpen?: boolean;
  validationError?: string | null;
  hideContent?: boolean;
  hideHeader?: boolean;
  headerOnly?: boolean;
};

export function ChatPanel(props: ChatPanelProps) {
  const thread_id = props.active_scene?.id ?? null;

  const [is_editing_title, set_is_editing_title] = useState(false);
  const [edit_title_value, set_edit_title_value] = useState("");
  const [copied, set_copied] = useState(false);
  const [chat_hovered, set_chat_hovered] = useState(false);

  const current_title = useCallback(() => {
    return props.active_scene?.title ?? "Untitled";
  }, [props.active_scene?.title]);

  const [display_title, set_display_title] = useState("");

  useEffect(() => {
    const title = current_title();
    set_display_title(title);
    set_edit_title_value(title);
  }, [current_title, thread_id]);

  // Reset edit state when switching scenes
  useEffect(() => {
    set_is_editing_title(false);
  }, [props.active_scene?.id]);

  const on_first_assistant_response = useCallback(
    async (options: {
      thread_id: string;
      first_user_message: string;
      scene: SavedScene;
    }) => {
      // Don't overwrite if scene already has a title (user-edited or previous auto-generation)
      if (options.scene.title && options.scene.title !== "Untitled") return;

      try {
        const title = await generate_title(options.first_user_message);
        set_display_title(title);
        upsert_scene({
          ...options.scene,
          title: title,
          updatedAt: Date.now(),
        });
        window.dispatchEvent(
          new CustomEvent("stemify:scenes-changed", {
            detail: { activeId: options.scene.id },
          }),
        );
      } catch {}
    },
    [],
  );

  const on_resolve_thread = useCallback(async (): Promise<ResolvedThread> => {
    if (props.active_scene) {
      return { threadId: props.active_scene.id, scene: props.active_scene };
    }

    const now = Date.now();
    const new_scene: SavedScene = {
      id: `scene_${now}`,
      title: "Untitled",
      createdAt: now,
      updatedAt: now,
      currentVersionId: null,
      versions: [],
    };

    // Persist the new scene
    const scenes = load_saved_scenes();
    save_saved_scenes([new_scene, ...scenes]);
    set_active_scene_id(new_scene.id);

    // Notify AppShell of new scene
    window.dispatchEvent(
      new CustomEvent("stemify:scenes-changed", {
        detail: { activeId: new_scene.id },
      }),
    );

    return { threadId: new_scene.id, scene: new_scene };
  }, [props.active_scene]);

  const on_send_user_message = useCallback(
    async (options: {
      thread_id: string;
      scene: SavedScene;
      user_text: string;
      mode: "ask" | "build" | "fix";
      model_id: string | undefined;
      on_first_delta: (assistant_message_id: string) => void;
      history?: ChatMessage[];
    }) => {
      clear_banner();

      let assistant_message_id: string | null = null;

      try {
        const snapshot = get_thread(options.thread_id);
        const history = options.history ?? snapshot.messages;

        await run_chat_turn({
          thread_id: options.thread_id,
          scene: options.scene,
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
          signal: get_current_abort_controller()?.signal,
        });
      } finally {
        set_current_abort_controller(null);
      }
    },
    [],
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
    if (
      trimmed &&
      trimmed !== display_title &&
      props.active_scene
    ) {
      set_display_title(trimmed);
      upsert_scene({
        ...props.active_scene,
        title: trimmed,
        updatedAt: Date.now(),
      });
      window.dispatchEvent(
        new CustomEvent("stemify:scenes-changed", {
          detail: { activeId: props.active_scene.id },
        }),
      );
    }
    set_is_editing_title(false);
  }, [edit_title_value, display_title, props.active_scene]);

  if (props.headerOnly) {
    return (
      <div className="flex items-center justify-between gap-2 px-4 py-2 shrink-0">
        {props.active_scene && is_editing_title ? (
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
        ) : props.active_scene ? (
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
                title="Edit Title"
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
                title="New Scene"
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
                title="Scenes"
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
              {props.showSceneEditorButton && (
                <Button
                  type="button"
                  variant="toolbar"
                  size="icon"
                  className={`h-7 w-7 transition-all duration-200 relative ${
                    props.isSceneEditorOpen
                      ? "bg-white/10 text-amber-400 hover:bg-white/15"
                      : "hover:bg-white/5"
                  }`}
                  onClick={() => {
                    props.onSceneEditorToggle?.();
                  }}
                  title="Scene Editor [ / ]"
                >
                  <Code2 className="h-4 w-4" />
                  {props.validationError && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      !
                    </span>
                  )}
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="toolbar"
                size="icon"
                className="h-7 w-7 transition-all duration-200"
                onClick={() => {
                  window.dispatchEvent(new Event("stemify:new-scene"));
                }}
                title="New Scene"
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
                title="Scenes"
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
              {props.showSceneEditorButton && (
                <Button
                  type="button"
                  variant="toolbar"
                  size="icon"
                  className={`h-7 w-7 transition-all duration-200 relative ${
                    props.isSceneEditorOpen
                      ? "bg-white/10 text-amber-400 hover:bg-white/15"
                      : "hover:bg-white/5"
                  }`}
                  onClick={() => {
                    props.onSceneEditorToggle?.();
                  }}
                  title="Scene Editor [ / ]"
                >
                  <Code2 className="h-4 w-4" />
                  {props.validationError && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      !
                    </span>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!props.hideHeader && (
        <div className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-2 shrink-0">
          {props.active_scene && is_editing_title ? (
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
          ) : props.active_scene ? (
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
                  title="Edit Title"
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
                  title="New Scene"
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
                  title="Scenes"
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
                {props.showSceneEditorButton && (
                  <Button
                    type="button"
                    variant="toolbar"
                    size="icon"
                    className={`h-7 w-7 transition-all duration-200 relative ${
                      props.isSceneEditorOpen
                        ? "bg-white/10 text-amber-400 hover:bg-white/15"
                        : "hover:bg-white/5"
                    }`}
                    onClick={() => {
                      props.onSceneEditorToggle?.();
                    }}
                    title="Scene Editor [ / ]"
                  >
                    <Code2 className="h-4 w-4" />
                    {props.validationError && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        !
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="toolbar"
                  size="icon"
                  className="h-7 w-7 transition-all duration-200"
                  onClick={() => {
                    window.dispatchEvent(new Event("stemify:new-scene"));
                  }}
                  title="New Scene"
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
                  title="Scenes"
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
                {props.showSceneEditorButton && (
                  <Button
                    type="button"
                    variant="toolbar"
                    size="icon"
                    className={`h-7 w-7 transition-all duration-200 relative ${
                      props.isSceneEditorOpen
                        ? "bg-white/10 text-amber-400 hover:bg-white/15"
                        : "hover:bg-white/5"
                    }`}
                    onClick={() => {
                      props.onSceneEditorToggle?.();
                    }}
                    title="Scene Editor [ / ]"
                  >
                    <Code2 className="h-4 w-4" />
                    {props.validationError && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        !
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div
        className={`min-h-0 flex-1 relative ${props.hideContent ? "hidden" : ""}`}
        onMouseEnter={() => set_chat_hovered(true)}
        onMouseLeave={() => set_chat_hovered(false)}
      >
        {props.active_scene && (
          <Button
            type="button"
            variant="toolbar"
            size="icon"
            className={`absolute top-2 right-4 h-7 w-7 z-10 transition-opacity duration-200 ${
              chat_hovered ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => {
              if (thread_id) {
                const text = format_chat_for_clipboard(thread_id);
                navigator.clipboard.writeText(text);
                set_copied(true);
                setTimeout(() => set_copied(false), 1500);
              }
            }}
            title="Copy conversation"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        )}
        <ChatRuntimeProvider
          thread_id={thread_id}
          on_resolve_thread={on_resolve_thread}
          on_send_user_message={on_send_user_message}
          on_first_assistant_response={on_first_assistant_response}
        >
          <Thread
            show_recent_scenes={!props.active_scene}
            thread_id={thread_id}
          />
        </ChatRuntimeProvider>
      </div>
    </div>
  );
}
