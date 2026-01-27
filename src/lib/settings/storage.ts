const OPENROUTER_API_KEY_STORAGE_KEY = "stemify.openrouter.api_key";

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
