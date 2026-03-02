"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Trash2, ArrowRight, UserPen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn, format_relative_date } from "@/lib/utils";
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
import {
  load_saved_scenes,
  set_current_version,
  delete_version,
  type SavedScene,
} from "@/lib/scene/store";

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

function truncate_description(desc: string, max_len: number = 40): string {
  const trimmed = desc.trim();
  if (trimmed.length <= max_len) return trimmed;
  return trimmed.slice(0, max_len - 1) + "…";
}

export function VersionHistoryDialog() {
  const [is_mounted, set_is_mounted] = useState(false);
  const [open, set_open] = useState(false);
  const [scene, set_scene] = useState<SavedScene | null>(null);
  const [confirm_delete_id, set_confirm_delete_id] = useState<string | null>(
    null,
  );
  const [focused_index, set_focused_index] = useState<number | null>(null);

  const refresh = (scene_id: string) => {
    const scenes = load_saved_scenes();
    const found = scenes.find((s) => s.id === scene_id);
    set_scene(found ?? null);
  };

  const confirm_delete = (version_id: string) => {
    if (!scene) return;

    const updated = delete_version(scene, version_id);
    set_scene(updated);

    window.dispatchEvent(
      new CustomEvent("stemify:scenes-changed", {
        detail: { activeId: scene.id },
      }),
    );
  };

  const select_version = useCallback((version_id: string) => {
    if (!scene) return;

    const updated = set_current_version(scene, version_id);
    set_scene(updated);

    window.dispatchEvent(
      new CustomEvent("stemify:scenes-changed", {
        detail: { activeId: scene.id },
      }),
    );

    set_open(false);
  }, [scene]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      set_is_mounted(true);
    });

    const on_open = (e: Event) => {
      const custom_event = e as CustomEvent<{ sceneId: string }>;
      const scene_id = custom_event.detail?.sceneId;
      if (scene_id) {
        refresh(scene_id);
        set_open(true);
      }
    };

    const on_close = () => {
      set_open(false);
    };

    const on_scenes_changed = (e: Event) => {
      const custom_event = e as CustomEvent<{ activeId: string }>;
      const scene_id = custom_event.detail?.activeId;
      if (scene_id && open) {
        refresh(scene_id);
      }
    };

    window.addEventListener("stemify:open-version-history", on_open);
    window.addEventListener("stemify:close-version-history", on_close);
    window.addEventListener("stemify:scenes-changed", on_scenes_changed);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("stemify:open-version-history", on_open);
      window.removeEventListener("stemify:close-version-history", on_close);
      window.removeEventListener("stemify:scenes-changed", on_scenes_changed);
    };
  }, [open]);

  const versions = scene?.versions ?? [];
  const current_version_id = scene?.currentVersionId ?? null;

  const active_version = versions.find((v) => v.id === current_version_id);
  const other_versions = versions
    .filter((v) => v.id !== current_version_id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const sorted_versions = useMemo(() => 
    active_version ? [active_version, ...other_versions] : other_versions,
    [active_version, other_versions]
  );

  const handle_key_down = useCallback((e: React.KeyboardEvent) => {
    const items = sorted_versions;
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      set_focused_index((prev) => {
        if (prev === null) return 0;
        return Math.min(prev + 1, items.length - 1);
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      set_focused_index((prev) => {
        if (prev === null) return items.length - 1;
        return Math.max(prev - 1, 0);
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focused_index !== null && focused_index < items.length) {
        const version = items[focused_index];
        if (version.id !== current_version_id) {
          select_version(version.id);
        }
      }
    }
  }, [sorted_versions, focused_index, current_version_id, select_version]);

  if (!is_mounted) return null;

  const title =
    versions.length > 0 ? `Versions (${versions.length})` : "Versions";

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (isOpen) set_focused_index(null);
        set_open(isOpen);
      }}>
        <DialogContent className="max-w-xl bg-white text-(--main-black) overflow-hidden max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Load and edit any prior version in. New version starts each time
              Assistant BUILDS.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div 
              className="space-y-2 pr-2"
              onKeyDown={handle_key_down}
              tabIndex={0}
            >
              {sorted_versions.map((version, index) => {
                const is_current = version.id === current_version_id;
                const can_delete = !is_current;
                const is_focused = focused_index === index;

                return (
                  <div
                    key={version.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 min-w-0 gap-2 overflow-hidden",
                      is_current
                        ? "border-amber-300 bg-amber-50 sticky top-0 z-10 cursor-default"
                        : is_focused
                          ? "border-amber-400 bg-amber-100 ring-2 ring-amber-400 ring-offset-1"
                          : "border-zinc-200 bg-zinc-50 cursor-pointer hover:bg-zinc-100",
                    )}
                    onClick={() => {
                      if (!is_current) {
                        select_version(version.id);
                      }
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 shrink-0">
                          {format_relative_date(version.createdAt)}
                        </span>
                        {version.userEditCount > 0 && (
                          <span
                            className="flex items-center gap-0.5 text-[10px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded shrink-0"
                            title={`Has ${version.userEditCount} user edit${version.userEditCount === 1 ? "" : "s"}`}
                          >
                            <UserPen className="h-2.5 w-2.5" />
                            <span>{version.userEditCount}</span>
                          </span>
                        )}
                        {is_current && (
                          <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded shrink-0 font-medium">
                            active
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-zinc-900 truncate">
                        &ldquo;{truncate_description(version.description)}
                        &rdquo;
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {can_delete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-500 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            set_confirm_delete_id(version.id);
                          }}
                          title="Delete version"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                      {!is_current && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-500 hover:text-zinc-900"
                          onClick={(e) => {
                            e.stopPropagation();
                            select_version(version.id);
                          }}
                          title="Load version"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {versions.length === 0 ? (
                <div className="rounded-md border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
                  Ask the Assistant to BUILD your first version or add code in
                  Scene Editor yourself!
                </div>
              ) : null}
            </div>
          </div>

          <Separator className="my-2" />

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => set_open(false)}>
              Close
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
            <AlertDialogTitle>Delete version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this version.
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
