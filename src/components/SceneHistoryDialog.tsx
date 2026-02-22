"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn, format_relative_date } from "@/lib/utils";
import {
  delete_scene,
  load_saved_scenes,
  save_saved_scenes,
  get_active_scene_id,
  clear_active_scene_id,
  ensure_version_history,
  type SavedScene,
} from "@/lib/scene/store";
import { get_starter_scenes } from "@/lib/scene/starter_scenes";
import { get_thread, remove_thread } from "@/lib/chat/store";

function make_confirm_dialog_key_handler(
  on_confirm: () => void,
): (e: React.KeyboardEvent<HTMLDivElement>) => void {
  return (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      on_confirm();
    }
    if (e.key === " ") {
      e.preventDefault();
      const cancel_btn = document.querySelector(
        "[data-slot='alert-dialog-cancel'] button",
      ) as HTMLButtonElement | null;
      cancel_btn?.click();
    }
  };
}

export type SceneHistoryDialogProps = {
  onLoadScene: (scene: SavedScene) => void;
};

export function SceneHistoryDialog(props: SceneHistoryDialogProps) {
  const [is_mounted, set_is_mounted] = useState(false);
  const [open, set_open] = useState(false);
  const [scenes, set_scenes] = useState<SavedScene[]>([]);
  const [confirm_delete_id, set_confirm_delete_id] = useState<string | null>(
    null,
  );

  const refresh = () => {
    set_scenes(load_saved_scenes());
  };

  const is_active = (scene_id: string): boolean => {
    return get_active_scene_id() === scene_id;
  };

  const get_chat_title = (scene_id: string): string => {
    const thread = get_thread(scene_id);
    return thread.title ?? "";
  };

  const confirm_delete = (scene_id: string) => {
    remove_thread(scene_id);
    delete_scene(scene_id);
    // Check if we're deleting the currently active scene
    const current_active = get_active_scene_id();
    if (current_active === scene_id) {
      clear_active_scene_id();
      window.dispatchEvent(new CustomEvent("stemify:load-scene", { detail: { scene: null } }));
    }
    refresh();
    window.dispatchEvent(new CustomEvent("stemify:scenes-changed"));
  };

  const restore_starter_scenes = () => {
    const existing = load_saved_scenes();
    const starters = get_starter_scenes();

    const missing = starters.filter((s) => !existing.some((e) => e.id === s.id));

    if (missing.length === 0) return;

    const withVersions = missing.map((s) => ensure_version_history(s));
    const merged = [...existing, ...withVersions];
    save_saved_scenes(merged);
    refresh();
    window.dispatchEvent(new CustomEvent("stemify:scenes-changed"));
  };

  const [has_missing_starters, set_has_missing_starters] = useState(false);

  const check_missing_starters = () => {
    const existing = load_saved_scenes();
    const starters = get_starter_scenes();
    set_has_missing_starters(starters.some((s) => !existing.some((e) => e.id === s.id)));
  };

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      set_is_mounted(true);
      refresh();
      check_missing_starters();
    });

    const on_open = () => {
      set_open(true);
      refresh();
      check_missing_starters();
    };

    const on_new = () => {
      window.dispatchEvent(new Event("stemify:confirm-new-scene"));
    };

    const on_scenes_changed = () => {
      refresh();
      check_missing_starters();
    };

    window.addEventListener("stemify:open-history", on_open);
    window.addEventListener("stemify:new-scene", on_new);
    window.addEventListener("stemify:scenes-changed", on_scenes_changed);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("stemify:open-history", on_open);
      window.removeEventListener("stemify:new-scene", on_new);
      window.removeEventListener("stemify:scenes-changed", on_scenes_changed);
    };
  }, []);

  const has_any = scenes.length > 0;

  const sorted_scenes = useMemo(() => {
    if (typeof window === "undefined") return scenes;
    const active_id = get_active_scene_id();
    const active = scenes.find((s) => s.id === active_id);
    const others = scenes.filter((s) => s.id !== active_id);
    return active ? [active, ...others] : scenes;
  }, [scenes]);

  const title = useMemo(() => {
    if (!has_any) return "Scenes";
    return `Scenes (${scenes.length})`;
  }, [has_any, scenes.length]);

  if (!is_mounted) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={set_open}>
        <DialogContent className="max-w-xl bg-white text-(--main-black) overflow-hidden max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              A list of your most recent scenes. Click on a scene to load it.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-2 pr-2">
              {sorted_scenes.map((s) => {
                const chat_title = get_chat_title(s.id);
                const display_title = chat_title || s.title;
                const is_current = is_active(s.id);

                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 min-w-0 gap-2 overflow-hidden",
                      is_current 
                        ? "border-amber-300 bg-amber-50 sticky top-0 z-10" 
                        : "border-zinc-200 bg-zinc-50 cursor-pointer hover:bg-zinc-100"
                    )}
                    onClick={() => {
                      if (!is_current) {
                        props.onLoadScene(s);
                        set_open(false);
                        window.dispatchEvent(
                          new CustomEvent("stemify:scenes-changed", {
                            detail: { activeId: s.id },
                          }),
                        );
                      }
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 shrink-0">
                          {format_relative_date(s.updatedAt)}
                        </span>
                        {is_current && (
                          <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded shrink-0 font-medium">
                            active
                          </span>
                        )}
                      </div>
                      <div 
                        className="text-sm font-medium text-zinc-900 truncate"
                        title={display_title}
                      >
                        {display_title}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          set_confirm_delete_id(s.id);
                        }}
                        title="Delete scene"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-zinc-900"
                        onClick={() => {
                          props.onLoadScene(s);
                          set_open(false);
                          window.dispatchEvent(
                            new CustomEvent("stemify:scenes-changed", {
                              detail: { activeId: s.id },
                            }),
                          );
                        }}
                        title="Load scene"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {!has_any ? (
                <div className="rounded-md border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
                  No saved scenes yet.
                </div>
              ) : null}
            </div>
          </div>

          <Separator className="my-2" />

          <div className="flex justify-between items-center">
            {has_missing_starters && (
              <Button
                variant="ghost"
                onClick={restore_starter_scenes}
              >
                Restore starter scenes
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => {
                set_open(false);
                window.dispatchEvent(new Event("stemify:confirm-new-scene"));
              }}
            >
              New scene
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirm_delete_id !== null}
        onOpenChange={() => set_confirm_delete_id(null)}
      >
        <AlertDialogContent
          onKeyDown={make_confirm_dialog_key_handler(() => {
            if (confirm_delete_id) {
              confirm_delete(confirm_delete_id);
            }
            set_confirm_delete_id(null);
          })}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scene?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this scene and its conversation
              history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction
              autoFocus
              onClick={() => {
                if (confirm_delete_id) {
                  confirm_delete(confirm_delete_id);
                }
                set_confirm_delete_id(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
