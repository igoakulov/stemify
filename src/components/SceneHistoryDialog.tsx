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
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  delete_scene,
  load_saved_scenes,
  type SavedScene,
} from "@/lib/scene/store";
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
  const [confirm_new_open, set_confirm_new_open] = useState(false);
  const [scenes, set_scenes] = useState<SavedScene[]>([]);
  const [confirm_delete_id, set_confirm_delete_id] = useState<string | null>(
    null,
  );

  const refresh = () => {
    set_scenes(load_saved_scenes());
  };

  const get_chat_title = (scene_id: string): string => {
    const thread = get_thread(scene_id);
    return thread.title ?? "";
  };

  const confirm_delete = (scene_id: string) => {
    remove_thread(scene_id);
    delete_scene(scene_id);
    refresh();
    window.dispatchEvent(new CustomEvent("stemify:scenes-changed"));
  };

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      set_is_mounted(true);
      refresh();
    });

    const on_open = () => {
      set_open(true);
      refresh();
    };

    const on_new = () => {
      set_confirm_new_open(true);
    };

    const on_scenes_changed = () => {
      refresh();
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

  const title = useMemo(() => {
    if (!has_any) return "Scenes";
    return `Scenes (${scenes.length})`;
  }, [has_any, scenes.length]);

  if (!is_mounted) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={set_open}>
        <DialogContent className="max-w-xl bg-white text-zinc-950">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {scenes.map((s) => {
              const chat_title = get_chat_title(s.id);
              const display_title = chat_title || s.title;

              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  <div
                    className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 cursor-pointer hover:text-zinc-700"
                    onClick={() => {
                      props.onLoadScene(s);
                      set_open(false);
                    }}
                  >
                    {display_title}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-red-600"
                      onClick={() => {
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

          <Separator className="my-2" />

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                set_confirm_new_open(true);
              }}
            >
              New scene
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm_new_open} onOpenChange={set_confirm_new_open}>
        <AlertDialogContent onKeyDown={make_confirm_dialog_key_handler(() => {
          set_open(false);
          window.dispatchEvent(new Event("stemify:confirm-new-scene"));
          set_confirm_new_open(false);
        })}>
          <AlertDialogHeader>
            <AlertDialogTitle>Create new scene?</AlertDialogTitle>
            <AlertDialogDescription>
              This will save your current scene, with the conversation, and open
              a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" type="button">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction
              autoFocus
              onClick={() => {
                set_open(false);
                window.dispatchEvent(new Event("stemify:confirm-new-scene"));
                set_confirm_new_open(false);
              }}
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirm_delete_id !== null}
        onOpenChange={() => set_confirm_delete_id(null)}
      >
        <AlertDialogContent onKeyDown={make_confirm_dialog_key_handler(() => {
          if (confirm_delete_id) {
            confirm_delete(confirm_delete_id);
          }
          set_confirm_delete_id(null);
        })}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scene?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this scene and its conversation
              history.
            </AlertDialogDescription>
          </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" type="button">Cancel</Button>
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
