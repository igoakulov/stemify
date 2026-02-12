import type { ObjectMeta } from "@/lib/scene/types";

export type CameraState = {
  position: [number, number, number];
  target: [number, number, number];
};

export type GridConfig = {
  enabled: boolean;    // Whether grid snapping is enabled
  size: number;        // Grid snap size (set by LLM via setGrid)
};

export type SavedScene = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  sceneCode: string;
  objects: ObjectMeta[];
  camera?: CameraState;
  grid?: GridConfig;   // Per-scene grid settings
};

export const MAX_SAVED_SCENES = 20;
const STORAGE_KEY = "stemify.scenes.v1";
const ACTIVE_SCENE_ID_KEY = "stemify.activeSceneId.v1";

export const DEFAULT_GRID_SIZE = 0.5;

export function get_default_grid_config(): GridConfig {
  return {
    enabled: true,
    size: DEFAULT_GRID_SIZE,
  };
}

export function load_saved_scenes(): SavedScene[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed as SavedScene[];
  } catch {
    return [];
  }
}

export function save_saved_scenes(scenes: SavedScene[]): void {
  // Enforce ordering + cap to keep storage bounded.
  const sorted = [...scenes].sort((a, b) => b.updatedAt - a.updatedAt);
  const capped = sorted.slice(0, MAX_SAVED_SCENES);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
}

export function upsert_scene(scene: SavedScene): SavedScene[] {
  const existing = load_saved_scenes();
  const filtered = existing.filter((s) => s.id !== scene.id);
  const next = [scene, ...filtered];
  save_saved_scenes(next);
  return load_saved_scenes();
}

export function delete_scene(scene_id: string): SavedScene[] {
  const existing = load_saved_scenes();
  const next = existing.filter((s) => s.id !== scene_id);
  save_saved_scenes(next);
  return load_saved_scenes();
}

export function get_active_scene_id(): string | null {
  return window.localStorage.getItem(ACTIVE_SCENE_ID_KEY);
}

export function set_active_scene_id(scene_id: string): void {
  window.localStorage.setItem(ACTIVE_SCENE_ID_KEY, scene_id);
}

export function clear_active_scene_id(): void {
  window.localStorage.removeItem(ACTIVE_SCENE_ID_KEY);
}

export function update_scene_grid(
  scene_id: string,
  updates: Partial<GridConfig>
): SavedScene[] {
  const existing = load_saved_scenes();
  const scene = existing.find((s) => s.id === scene_id);
  
  if (!scene) {
    return existing;
  }

  const new_grid: GridConfig = {
    enabled: scene.grid?.enabled ?? true,
    size: scene.grid?.size ?? DEFAULT_GRID_SIZE,
    ...updates,
  };

  const updated_scene: SavedScene = {
    ...scene,
    grid: new_grid,
    updatedAt: Date.now(),
  };

  return upsert_scene(updated_scene);
}
