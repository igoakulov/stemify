import { get_user_guid } from "./user-id";

const SCENE_LOG_KEY = "stemify.scene_log.v1";
const MAX_ENTRIES = 1000;

export type SceneLogEntry = {
  timestamp: string;
  llm_model: string;
  scene_id: string;
  success: boolean;
  error: string;
  scene_code: string;
};

function get_locale(): string {
  if (typeof navigator !== "undefined") {
    return navigator.language || "unknown";
  }
  return "unknown";
}

function get_timezone(): string {
  if (typeof Intl !== "undefined") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  }
  return "unknown";
}

function load_logs(): SceneLogEntry[] {
  try {
    const stored = window.localStorage.getItem(SCENE_LOG_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as SceneLogEntry[];
  } catch {
    return [];
  }
}

function save_logs(logs: SceneLogEntry[]): void {
  try {
    window.localStorage.setItem(SCENE_LOG_KEY, JSON.stringify(logs));
  } catch {
    // localStorage full - FIFO will handle on next add
  }
}

function remove_oldest_success(logs: SceneLogEntry[]): SceneLogEntry[] {
  const idx = logs.findIndex((l) => l.success);
  if (idx === -1) return logs;
  const result = [...logs];
  result.splice(idx, 1);
  return result;
}

function remove_oldest_failure(logs: SceneLogEntry[]): SceneLogEntry[] {
  const idx = logs.findIndex((l) => !l.success);
  if (idx === -1) return logs;
  const result = [...logs];
  result.splice(idx, 1);
  return result;
}

export type LogSceneParams = {
  scene_id: string;
  llm_model: string;
  llm_response: Record<string, unknown>;
  success: boolean;
  error?: string;
};

export function log_scene_generated(params: LogSceneParams): void {
  const logs = load_logs();
  const is_failure = !params.success;

  let logs_to_save = logs;

  if (logs.length >= MAX_ENTRIES) {
    if (is_failure) {
      if (logs.every((l) => !l.success)) {
        logs_to_save = remove_oldest_failure(logs);
      } else {
        logs_to_save = remove_oldest_success(logs);
      }
    } else {
      if (logs.every((l) => !l.success)) {
        return;
      }
      logs_to_save = remove_oldest_success(logs);
    }
  }

  const entry: SceneLogEntry = {
    timestamp: new Date().toISOString(),
    llm_model: params.llm_model,
    scene_id: params.scene_id,
    success: params.success,
    error: params.error || "",
    scene_code: JSON.stringify(params.llm_response),
  };

  logs.push(entry);
  save_logs(logs_to_save);
}

export function get_scene_log_count(): number {
  return load_logs().length;
}

export function export_scene_logs(): void {
  const logs = load_logs();
  const export_data = {
    exported_at: new Date().toISOString(),
    user_guid: get_user_guid(),
    locale: get_locale(),
    timezone: get_timezone(),
    entries: logs,
  };
  const content = JSON.stringify(export_data, null, 2);

  const date = new Date().toISOString().split("T")[0];
  const filename = `scene_log_${date}.json`;

  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function clear_scene_logs(): void {
  window.localStorage.removeItem(SCENE_LOG_KEY);
}
