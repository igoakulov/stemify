import type { ObjectMeta } from "@/lib/scene/types";

export type CameraState = {
  position: [number, number, number];
  target: [number, number, number];
};

export type SavedScene = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  sceneCode: string;
  objects: ObjectMeta[];
  camera?: CameraState;
};

export const MAX_SAVED_SCENES = 20;
const STORAGE_KEY = "stemify.scenes.v1";
const ACTIVE_SCENE_ID_KEY = "stemify.activeSceneId.v1";

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
