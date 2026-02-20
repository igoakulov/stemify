const CAMERA_MODE_STORAGE_KEY = "stemify.camera.mode";

export type CameraMode = "rotate" | "fly";

export function load_camera_mode(): CameraMode {
  try {
    const raw = window.localStorage.getItem(CAMERA_MODE_STORAGE_KEY);
    return raw === "fly" ? "fly" : "rotate";
  } catch {
    return "rotate";
  }
}

export function save_camera_mode(mode: CameraMode): void {
  window.localStorage.setItem(CAMERA_MODE_STORAGE_KEY, mode);
}
