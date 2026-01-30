"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SceneHistoryDialog } from "@/components/SceneHistoryDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { SceneViewport } from "@/components/SceneViewport";
import { SceneToolbar } from "@/components/SceneToolbar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { seed_starter_scenes_if_empty } from "@/lib/scene/seed";
import {
  load_saved_scenes,
  save_saved_scenes,
  type SavedScene,
} from "@/lib/scene/store";

export function AppShell() {
  const [active_saved_scene, set_active_saved_scene] = useState<SavedScene | null>(null);
  const [recent_scenes, set_recent_scenes] = useState<SavedScene[]>([]);
  const active_scene_id_ref = useRef<string | null>(null);

  const refresh_from_storage = useCallback((active_id_override?: string) => {
    const scenes = load_saved_scenes();
    set_recent_scenes(scenes.slice(0, 5));

    const active_id = active_id_override ?? active_scene_id_ref.current;
    if (!active_id) {
      const next = scenes[0] ?? null;
      active_scene_id_ref.current = next?.id ?? null;
      set_active_saved_scene(next);
      return;
    }

    const still_exists = scenes.find((s) => s.id === active_id) ?? null;
    const next = still_exists ?? scenes[0] ?? null;
    active_scene_id_ref.current = next?.id ?? null;
    set_active_saved_scene(next);
  }, []);
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      seed_starter_scenes_if_empty();
      const scenes = load_saved_scenes();
      set_recent_scenes(scenes.slice(0, 5));
      const initial = scenes[0] ?? null;
      active_scene_id_ref.current = initial?.id ?? null;
      set_active_saved_scene(initial);
    });

    const on_confirm_new = () => {
      const now = Date.now();
      const new_scene: SavedScene = {
        id: `scene_${now}`,
        title: "Untitled",
        createdAt: now,
        updatedAt: now,
        sceneCode: "",
        objects: [],
      };

      // Persist + make it the active scene.
      const next = [new_scene, ...load_saved_scenes()];
      save_saved_scenes(next);
      active_scene_id_ref.current = new_scene.id;
      window.dispatchEvent(
        new CustomEvent("stemify:scenes-changed", { detail: { activeId: new_scene.id } }),
      );
    };

    const on_scenes_changed = (event: Event) => {
      const custom = event as CustomEvent<{ activeId?: string }>;
      refresh_from_storage(custom.detail?.activeId);
    };

    window.addEventListener("stemify:confirm-new-scene", on_confirm_new);
    window.addEventListener("stemify:scenes-changed", on_scenes_changed);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("stemify:confirm-new-scene", on_confirm_new);
      window.removeEventListener("stemify:scenes-changed", on_scenes_changed);
    };
  }, [refresh_from_storage]);

  return (
    <div className="h-dvh w-full overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="grid h-full grid-cols-[minmax(0,7fr)_minmax(0,3fr)] overflow-hidden">
         <section className="border-r border-white/5 relative h-full overflow-hidden">
           <div className="h-full p-4 flex flex-col">
              <div className="relative flex-1 min-h-0">
                <SceneViewport sceneCode={active_saved_scene?.sceneCode ?? ""} />
                <SceneToolbar
                  onNewScene={() => window.dispatchEvent(new Event("stemify:new-scene"))}
                  onOpenHistory={() => window.dispatchEvent(new Event("stemify:open-history"))}
                  onResetCamera={() => window.dispatchEvent(new Event("stemify:camera-reset"))}
                  onOpenSettings={() => window.dispatchEvent(new Event("stemify:open-settings"))}
                />
              </div>
           </div>
           <SceneHistoryDialog
             onLoadScene={(scene) => {
               active_scene_id_ref.current = scene.id;
               refresh_from_storage(scene.id);
             }}
           />
           <SettingsDialog />
         </section>

        <aside className="flex h-full flex-col overflow-hidden">
          {active_saved_scene ? (
            <ChatPanel active_scene={active_saved_scene} />
          ) : (
            <div className="flex-1 overflow-auto p-4">
              <div className="mx-auto max-w-md pt-10">
                <div className="text-sm font-medium text-primary">Recent scenes</div>
                <div className="mt-6 space-y-2">
                  {recent_scenes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                       className="w-full rounded-lg border border-white/5 px-3 py-2 text-left text-sm text-secondary hover:border-white/10"
                      onClick={() => {
                        active_scene_id_ref.current = s.id;
                        set_active_saved_scene(s);
                      }}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-3 text-xs text-secondary hover:text-white"
                  onClick={() => {
                    window.dispatchEvent(new Event("stemify:open-history"));
                  }}
                >
                  Show all
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
