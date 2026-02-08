"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SceneHistoryDialog } from "@/components/SceneHistoryDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { SceneViewport } from "@/components/SceneViewport";
import { SceneToolbar } from "@/components/SceneToolbar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { seed_starter_scenes_if_empty } from "@/lib/scene/seed";
import { clear_banner } from "@/lib/chat/banner";
import {
  load_saved_scenes,
  get_active_scene_id,
  set_active_scene_id,
  clear_active_scene_id,
  type SavedScene,
} from "@/lib/scene/store";
import { get_current_abort_controller, set_current_abort_controller } from "@/lib/chat/store";

export function AppShell() {
  const [active_scene, set_active_scene] = useState<SavedScene | null>(null);
  const active_scene_id_ref = useRef<string | null>(null);

    const refresh_from_storage = useCallback((active_id_override?: string) => {
      const scenes = load_saved_scenes();
      const local_active_id = get_active_scene_id();

      // If override provided but localStorage doesn't have it,
      // the scene was explicitly cleared - treat as zero state
      if (active_id_override && active_id_override !== local_active_id) {
        active_scene_id_ref.current = null;
        set_active_scene(null);
        return;
      }

      const active_id = local_active_id ?? active_scene_id_ref.current;
      if (!active_id) {
        set_active_scene(null);
        return;
      }

      const still_exists = scenes.find((s) => s.id === active_id) ?? null;
      active_scene_id_ref.current = still_exists?.id ?? null;
      set_active_scene(still_exists);
    }, []);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      seed_starter_scenes_if_empty();
      // Restore previously active scene, or most recent if none
      const scenes = load_saved_scenes();
      if (scenes.length === 0) return;

      const previous_active_id = get_active_scene_id();
      const previous_active = scenes.find((s) => s.id === previous_active_id);

      if (previous_active) {
        active_scene_id_ref.current = previous_active.id;
        set_active_scene(previous_active);
      }
      // If no active scene ID, stay at zero state (RecentScenes displayed)
    });

    const on_confirm_new = () => {
      // Abort any in-flight request immediately
      const controller = get_current_abort_controller();
      controller?.abort();
      set_current_abort_controller(null);
      // Clear active scene ID first (before dispatching event)
      clear_active_scene_id();
      // Clear active scene to start fresh
      // Scene will be created on first message
      // Dispatch event for UI switch, then update refs
      window.dispatchEvent(new CustomEvent("stemify:load-scene", { detail: { scene: null } }));
      active_scene_id_ref.current = null;
      set_active_scene(null);
      clear_banner();
    };

    const on_scenes_changed = (event: Event) => {
      const custom = event as CustomEvent<{ activeId?: string }>;
      refresh_from_storage(custom.detail?.activeId);
    };

    const on_load_scene = (event: Event) => {
      const custom = event as CustomEvent<{ scene: SavedScene | null }>;
      const scene = custom.detail.scene;
      if (scene === null) {
        // Zero state - clear everything
        active_scene_id_ref.current = null;
        set_active_scene(null);
        clear_active_scene_id();
        clear_banner();
      } else {
        active_scene_id_ref.current = scene.id;
        set_active_scene(scene);
        set_active_scene_id(scene.id);
        // Don't clear banner here - let SceneViewport validation show errors if any
      }
    };

    window.addEventListener("stemify:confirm-new-scene", on_confirm_new);
    window.addEventListener("stemify:scenes-changed", on_scenes_changed);
    window.addEventListener("stemify:load-scene", on_load_scene);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("stemify:confirm-new-scene", on_confirm_new);
      window.removeEventListener("stemify:scenes-changed", on_scenes_changed);
      window.removeEventListener("stemify:load-scene", on_load_scene);
    };
  }, [refresh_from_storage]);

  return (
    <div className="h-dvh w-full overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="grid h-full grid-cols-[minmax(0,7fr)_minmax(310px,3fr)] overflow-hidden">
          <section className="relative h-full overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="relative flex-1 min-h-0">
                  <SceneViewport key={active_scene?.id} sceneCode={active_scene?.sceneCode ?? ""} sceneId={active_scene?.id ?? ""} />
                  <SceneToolbar
                    onResetCamera={() => window.dispatchEvent(new Event("stemify:camera-reset"))}
                    onGoHome={() => {
                      window.dispatchEvent(new Event("stemify:confirm-new-scene"));
                    }}
                  />
                </div>
            </div>
            <SceneHistoryDialog
              onLoadScene={(scene) => {
                active_scene_id_ref.current = scene.id;
                set_active_scene_id(scene.id);
                refresh_from_storage(scene.id);
                // Don't clear banner here - let SceneViewport validation show errors if any
              }}
            />
            <SettingsDialog />
          </section>

          <aside className="flex h-full flex-col overflow-hidden">
            <ChatPanel active_scene={active_scene} />
         </aside>
      </div>
    </div>
  );
}
