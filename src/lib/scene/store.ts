export type CameraState = {
  position: [number, number, number];
  target: [number, number, number];
};

export type GridConfig = {
  enabled: boolean;    // Whether grid snapping is enabled
  size: number;        // Grid snap size (set by LLM via setGrid)
};

export type SceneVersion = {
  id: string;
  sceneId: string;
  createdAt: number;
  description: string;
  sceneCode: string;
  userEditCount: number;
};

export type SavedScene = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  sceneCode: string;
  currentVersionId: string | null;
  versions: SceneVersion[];
  camera?: CameraState;
  grid?: GridConfig;
};

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

    const scenes = parsed as SavedScene[];
    return scenes.map((scene) => ensure_version_history(scene));
  } catch {
    return [];
  }
}

export function save_saved_scenes(scenes: SavedScene[]): void {
  const sorted = [...scenes].sort((a, b) => b.updatedAt - a.updatedAt);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
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

function make_version_id(): string {
  const now = Date.now();
  const random = Math.random().toString(36).slice(2, 6);
  return `ver_${now}_${random}`;
}

export function ensure_version_history(scene: SavedScene): SavedScene {
  if (scene.versions && scene.versions.length > 0) {
    return scene;
  }

  if (!scene.sceneCode || !scene.sceneCode.trim()) {
    return scene;
  }

  const version: SceneVersion = {
    id: make_version_id(),
    sceneId: scene.id,
    createdAt: scene.createdAt || Date.now(),
    description: "Initial version",
    sceneCode: scene.sceneCode,
    userEditCount: 0,
  };

  const updated: SavedScene = {
    ...scene,
    versions: [version],
    currentVersionId: version.id,
  };

  return upsert_scene(updated)[0] ?? updated;
}

export function add_version(
  scene: SavedScene,
  description: string,
  sceneCode: string
): SavedScene {
  const version: SceneVersion = {
    id: make_version_id(),
    sceneId: scene.id,
    createdAt: Date.now(),
    description,
    sceneCode,
    userEditCount: 0,
  };

  const updated: SavedScene = {
    ...scene,
    versions: [version, ...(scene.versions ?? [])],
    currentVersionId: version.id,
    sceneCode,
    updatedAt: Date.now(),
  };

  return upsert_scene(updated)[0] ?? updated;
}

export function delete_version(scene: SavedScene, versionId: string): SavedScene {
  // Prevent deletion of currently active version
  if (scene.currentVersionId === versionId) {
    return scene;
  }

  const filtered = (scene.versions ?? []).filter((v) => v.id !== versionId);

  const updated: SavedScene = {
    ...scene,
    versions: filtered,
    updatedAt: Date.now(),
  };

  return upsert_scene(updated)[0] ?? updated;
}

export function set_current_version(
  scene: SavedScene,
  versionId: string
): SavedScene {
  const version = (scene.versions ?? []).find((v) => v.id === versionId);
  if (!version) {
    return scene;
  }

  const updated: SavedScene = {
    ...scene,
    currentVersionId: versionId,
    sceneCode: version.sceneCode,
    updatedAt: Date.now(),
  };

  return upsert_scene(updated)[0] ?? updated;
}

export function increment_user_edit_count(scene: SavedScene): SavedScene {
  if (!scene.currentVersionId) {
    return scene;
  }

  const updatedVersions = (scene.versions ?? []).map((v) => {
    if (v.id === scene.currentVersionId) {
      return { ...v, userEditCount: v.userEditCount + 1 };
    }
    return v;
  });

  const updated: SavedScene = {
    ...scene,
    versions: updatedVersions,
    updatedAt: Date.now(),
  };

  return upsert_scene(updated)[0] ?? updated;
}

export function get_effective_scene_code(scene: SavedScene): string {
  if (scene.currentVersionId) {
    const version = (scene.versions ?? []).find((v) => v.id === scene.currentVersionId);
    if (version) {
      return version.sceneCode;
    }
  }
  return scene.sceneCode;
}

export function update_current_version_code(scene: SavedScene, code: string): SavedScene {
  if (!scene.currentVersionId || !scene.versions || scene.versions.length === 0) {
    return scene;
  }

  const currentVid = scene.currentVersionId;
  
  const updatedVersions = scene.versions.map((v) => {
    if (v.id === currentVid) {
      return { ...v, sceneCode: code };
    }
    return v;
  });

  const updated: SavedScene = {
    ...scene,
    versions: updatedVersions,
    currentVersionId: currentVid,
    sceneCode: code,
    updatedAt: Date.now(),
  };

  return upsert_scene(updated)[0] ?? updated;
}
