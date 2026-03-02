"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { load_saved_scenes, type SavedScene } from "@/lib/scene/store";

const SCENE_BUTTON_HEIGHT = 36;
const SHOW_ALL_BUTTON_HEIGHT = 32;
const PADDING = 16;

export function RecentScenes() {
  const [is_mounted, set_is_mounted] = useState(false);
  const [scenes, set_scenes] = useState<SavedScene[]>([]);
  const container_ref = useRef<HTMLDivElement>(null);
  const [container_height, set_container_height] = useState(0);

  const get_max_scenes = (height: number) => {
    if (height <= 0) return 5;

    const height_for_5 = SCENE_BUTTON_HEIGHT * 5 + SHOW_ALL_BUTTON_HEIGHT + PADDING;
    const height_for_3 = SCENE_BUTTON_HEIGHT * 3 + SHOW_ALL_BUTTON_HEIGHT + PADDING;

    if (height >= height_for_5) return 5;
    if (height >= height_for_3) return 3;
    return 2;
  };

  const max_recent_scenes = get_max_scenes(container_height);

  const load_scenes = useCallback(() => {
    const all_scenes = load_saved_scenes();
    set_scenes(all_scenes.slice(0, max_recent_scenes));
  }, [max_recent_scenes]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      set_is_mounted(true);
      load_scenes();
    });

    const on_scenes_changed = () => {
      load_scenes();
    };

    window.addEventListener("stemify:scenes-changed", on_scenes_changed);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("stemify:scenes-changed", on_scenes_changed);
    };
  }, [max_recent_scenes, load_scenes]);

  useEffect(() => {
    const container = container_ref.current;
    if (!container) return;

    const update_height = () => {
      set_container_height(container.clientHeight);
    };

    update_height();

    const resize_observer = new ResizeObserver(() => {
      update_height();
    });
    resize_observer.observe(container);

    return () => resize_observer.disconnect();
  }, []);

  if (!is_mounted) {
    return null;
  }

  const handle_load_scene = (scene: SavedScene) => {
    window.dispatchEvent(
      new CustomEvent("stemify:load-scene", { detail: { scene } }),
    );
  };

  const handle_open_history = () => {
    window.dispatchEvent(new Event("stemify:open-history"));
  };

  if (scenes.length === 0) {
    return null;
  }

  return (
    <div ref={container_ref} className="w-full min-w-0">
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
