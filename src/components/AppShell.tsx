"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SceneHistoryDialog } from "@/components/SceneHistoryDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { SceneViewport } from "@/components/SceneViewport";
import { create_empty_scene } from "@/lib/app_state";
import { seed_starter_scenes_if_empty } from "@/lib/scene/seed";
import {
  load_saved_scenes,
  save_saved_scenes,
  type SavedScene,
} from "@/lib/scene/store";

export function AppShell() {
  const active_scene = useMemo(() => create_empty_scene(), []);
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
    <div className="h-dvh w-full bg-zinc-950 text-zinc-50">
      <div className="grid h-full grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <section className="border-r border-white/10">
          <header className="flex h-14 items-center justify-between px-4">
            <div className="flex items-baseline gap-3">
              <div className="text-sm font-medium tracking-wide">STEMify</div>
              <div className="text-xs text-white/50">{active_scene.title}</div>
            </div>
            <div className="flex items-center gap-2">
               <button
                 type="button"
                 className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/90 hover:border-white/30 disabled:opacity-60"
                 aria-label="New scene"
                 onClick={() => {
                   window.dispatchEvent(new Event("stemify:new-scene"));
                 }}
               >
                 New
               </button>
               <button
                 type="button"
                 className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/90 hover:border-white/30 disabled:opacity-60"
                 aria-label="Scene history"
                 onClick={() => {
                   window.dispatchEvent(new Event("stemify:open-history"));
                 }}
               >
                 History
               </button>
               <button
                 type="button"
                 className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/90 hover:border-white/30"
                 aria-label="Reset camera"
                 onClick={() => {
                   window.dispatchEvent(new Event("stemify:camera-reset"));
                 }}
               >
                 R
               </button>
               <div className="ml-2">
                 <SettingsDialog />
               </div>
            </div>
          </header>

          <div className="h-[calc(100%-3.5rem)] p-4">
             <SceneViewport sceneCode={active_saved_scene?.sceneCode ?? ""} />
             <SceneHistoryDialog
               onLoadScene={(scene) => {
                 active_scene_id_ref.current = scene.id;
                 refresh_from_storage(scene.id);
               }}
             />
          </div>
        </section>

        <aside className="flex h-full flex-col">
          <div className="flex-1 overflow-auto p-4">
            <div className="mx-auto max-w-md pt-10">
              <div className="text-sm font-medium text-white/90">Describe a STEM concept</div>
              <div className="mt-2 text-xs leading-5 text-white/50">
                Milestone 0: chat UI placeholder.
              </div>

               <div className="mt-6 rounded-xl border border-white/10 bg-white/3 p-4">
                 <div className="text-xs text-white/60">Recent scenes</div>
                 <div className="mt-3 space-y-2">
                   {recent_scenes.map((s) => (
                     <button
                       key={s.id}
                       type="button"
                       className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-white/80 hover:border-white/25"
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
                   className="mt-3 text-xs text-white/60 hover:text-white"
                   onClick={() => {
                     window.dispatchEvent(new Event("stemify:open-history"));
                   }}
                 >
                   Show all
                 </button>
               </div>
            </div>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="flex gap-2">
                <textarea
                  className="h-12 flex-1 resize-none rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-sm text-white/90 placeholder:text-white/40 focus:border-white/25 focus:outline-none"

                placeholder="e.g., explain dot product visually"
                disabled
              />
              <button
                type="button"
                className="h-12 rounded-lg bg-white/90 px-4 text-sm font-medium text-zinc-950 disabled:opacity-60"
                disabled
              >
                Send
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
