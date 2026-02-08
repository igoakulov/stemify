"use client";

import { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  load_saved_scenes,
  type SavedScene,
} from "@/lib/scene/store";

const MAX_RECENT_SCENES = 5;

export function RecentScenes() {
  const [is_mounted, set_is_mounted] = useState(false);
  const [scenes, set_scenes] = useState<SavedScene[]>([]);

  const refresh = useCallback(() => {
    const all_scenes = load_saved_scenes();
    set_scenes(all_scenes.slice(0, MAX_RECENT_SCENES));
  }, []);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      set_is_mounted(true);
      refresh();
    });

    const on_scenes_changed = () => {
      refresh();
    };

    window.addEventListener("stemify:scenes-changed", on_scenes_changed);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("stemify:scenes-changed", on_scenes_changed);
    };
  }, [refresh]);

  if (!is_mounted) {
    return null;
  }

  const handle_load_scene = (scene: SavedScene) => {
    window.dispatchEvent(
      new CustomEvent("stemify:load-scene", { detail: { scene } })
    );
  };

  const handle_open_history = () => {
    window.dispatchEvent(new Event("stemify:open-history"));
  };

  if (scenes.length === 0) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="text-sm font-semibold text-white/60">
          No scenes yet
        </div>
        <div className="mt-2 text-sm leading-6 text-white/40">
          Start a conversation to create your first scene
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="space-y-1">
        {scenes.map((scene) => (
          <Button
            key={scene.id}
            variant="toolbar"
            className="w-full h-9 px-3 text-left min-w-0 overflow-hidden justify-start gap-3"
            onClick={() => handle_load_scene(scene)}
          >
            <History className="h-4 w-4 shrink-0 text-white/40" />
            <span className="text-sm font-medium truncate flex-1 min-w-0">
              {scene.title}
            </span>
          </Button>
        ))}
      </div>

      <div className="flex justify-center mt-2">
        <Button
          variant="toolbar"
          size="sm"
          className="text-xs text-white/60 hover:text-white/90"
          onClick={handle_open_history}
        >
          Show all
        </Button>
      </div>
    </div>
  );
}
