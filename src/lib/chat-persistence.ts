import type { ChatMessage } from "@/lib/chat/types";

export type ChatThreadId = string;

export type ChatThreadState = {
  messages: ChatMessage[];
  is_running: boolean;
  mode: "ask" | "build";
  model: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
};

const CHAT_STORAGE_KEY = "stemify.chat.v1";

export function load_chat(thread_id: ChatThreadId): ChatThreadState | null {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<ChatThreadId, ChatThreadState>;
    return parsed[thread_id] ?? null;
  } catch {
    return null;
  }
}

export function save_chat(thread_id: ChatThreadId, state: ChatThreadState): void {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as Record<ChatThreadId, ChatThreadState>) : {};

    const updated = {
      ...existing,
      [thread_id]: { ...state, updatedAt: Date.now() },
    };

    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail - localStorage errors shouldn't break the app
  }
}

export function delete_chat(thread_id: ChatThreadId): void {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return;

    const existing = JSON.parse(raw) as Record<ChatThreadId, ChatThreadState>;
    const remaining = { ...existing };
    delete remaining[thread_id];

    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(remaining));
  } catch {
    // Silently fail
  }
}

export function create_empty_chat(thread_id: ChatThreadId, mode: "ask" | "build", model: string): ChatThreadState {
  const now = Date.now();
  return {
    messages: [],
    is_running: false,
    mode,
    model,
    createdAt: now,
    updatedAt: now,
  };
}
