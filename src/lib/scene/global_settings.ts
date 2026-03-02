const GRID_SNAP_STORAGE_KEY = "stemify.camera.gridSnap";
const FLY_SPEED_INDEX_STORAGE_KEY = "stemify.camera.flySpeedIndex";

export function load_grid_snap(): boolean {
  try {
    const raw = window.localStorage.getItem(GRID_SNAP_STORAGE_KEY);
    return raw === "true" ? true : false;
  } catch {
    return false;
  }
}

export function save_grid_snap(enabled: boolean): void {
  window.localStorage.setItem(GRID_SNAP_STORAGE_KEY, String(enabled));
}

export function load_fly_speed_index(): number {
  try {
    const raw = window.localStorage.getItem(FLY_SPEED_INDEX_STORAGE_KEY);
    const parsed = parseInt(raw ?? "", 10);
    return isNaN(parsed) || parsed < 0 || parsed > 5 ? 1 : parsed;
  } catch {
    return 1;
  }
}

export function save_fly_speed_index(index: number): void {
  window.localStorage.setItem(FLY_SPEED_INDEX_STORAGE_KEY, String(index));
}
