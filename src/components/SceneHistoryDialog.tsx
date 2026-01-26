"use client";

import { useEffect, useMemo, useState } from "react";

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

export type SceneHistoryDialogProps = {
  onLoadScene: (scene: SavedScene) => void;
};

export function SceneHistoryDialog(props: SceneHistoryDialogProps) {
  const [is_mounted, set_is_mounted] = useState(false);
  const [open, set_open] = useState(false);
  const [confirm_new_open, set_confirm_new_open] = useState(false);
  const [scenes, set_scenes] = useState<SavedScene[]>([]);

  const refresh = () => {
    set_scenes(load_saved_scenes());
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {scenes.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{s.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {s.id}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      props.onLoadScene(s);
                      set_open(false);
                      window.dispatchEvent(new CustomEvent("stemify:scenes-changed", { detail: { activeId: s.id } }));
                    }}
                  >
                    Load
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      delete_scene(s.id);
                      refresh();
                      window.dispatchEvent(new CustomEvent("stemify:scenes-changed"));

                      // If the active scene is deleted, AppShell will pick the next most recent.

                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}

            {!has_any ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
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
              This will reset to a blank scene. Your current scene remains in history.
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
