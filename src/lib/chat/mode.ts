const CHAT_MODE_STORAGE_KEY = "stemify.chat.mode";

export type ChatMode = "ask" | "build";

export function load_chat_mode(): ChatMode {
  try {
    const raw = window.localStorage.getItem(CHAT_MODE_STORAGE_KEY);
    return raw === "build" ? "build" : "ask";
  } catch {
    return "ask";
  }
}

export function save_chat_mode(mode: ChatMode): void {
  window.localStorage.setItem(CHAT_MODE_STORAGE_KEY, mode);
}
