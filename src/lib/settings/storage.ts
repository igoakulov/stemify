const OPENROUTER_API_KEY_STORAGE_KEY = "stemify.openrouter.api_key";
const OPENROUTER_MODEL_ID_STORAGE_KEY = "stemify.openrouter.model_id";

export function load_openrouter_api_key(): string {
  try {
    return window.localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function save_openrouter_api_key(api_key: string): void {
  window.localStorage.setItem(OPENROUTER_API_KEY_STORAGE_KEY, api_key);
}

export function clear_openrouter_api_key(): void {
  window.localStorage.removeItem(OPENROUTER_API_KEY_STORAGE_KEY);
}

export function load_openrouter_model_id(): string {
  try {
    return window.localStorage.getItem(OPENROUTER_MODEL_ID_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function save_openrouter_model_id(model_id: string): void {
  window.localStorage.setItem(OPENROUTER_MODEL_ID_STORAGE_KEY, model_id);
}

export function clear_openrouter_model_id(): void {
  window.localStorage.removeItem(OPENROUTER_MODEL_ID_STORAGE_KEY);
}
