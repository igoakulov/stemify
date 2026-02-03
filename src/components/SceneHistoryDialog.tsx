"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Trash2, Check, ArrowRight } from "lucide-react";

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
import { get_thread } from "@/lib/chat/store";

export type SceneHistoryDialogProps = {
  onLoadScene: (scene: SavedScene) => void;
};

export function SceneHistoryDialog(props: SceneHistoryDialogProps) {
  const [is_mounted, set_is_mounted] = useState(false);
  const [open, set_open] = useState(false);
  const [confirm_new_open, set_confirm_new_open] = useState(false);
  const [scenes, set_scenes] = useState<SavedScene[]>([]);
  const [copied_id, set_copied_id] = useState<string | null>(null);

  const refresh = () => {
    set_scenes(load_saved_scenes());
  };

  const copy_chat_to_clipboard = async (scene_id: string) => {
    const snapshot = get_thread(scene_id);

    const format_datetime = (timestamp: number): string => {
      const iso = new Date(timestamp).toISOString();
      return iso.slice(0, 16).replace("T", " ");
    };

    const extract_model_name = (model_id: string): string => {
      const parts = model_id.split("/");
      return parts[parts.length - 1] || model_id;
    };

    const out = snapshot.messages
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

    await navigator.clipboard.writeText(out);
    set_copied_id(scene_id);
    setTimeout(() => set_copied_id(null), 1500);
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
            {scenes.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-zinc-900">
                    {s.title}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 hover:text-zinc-900"
                    onClick={() => {
                      void copy_chat_to_clipboard(s.id);
                    }}
                    title={copied_id === s.id ? "Copied!" : "Copy chat"}
                  >
                    {copied_id === s.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 hover:text-red-600"
                    onClick={() => {
                      delete_scene(s.id);
                      refresh();
                      window.dispatchEvent(
                        new CustomEvent("stemify:scenes-changed"),
                      );
                    }}
                    title="Delete scene"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="default"
                    size="icon"
                    className="h-8 w-8"
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
            ))}

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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create new scene?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset to a blank scene. Your current scene remains in
              history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.dispatchEvent(new Event("stemify:confirm-new-scene"));
                set_confirm_new_open(false);
              }}
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
