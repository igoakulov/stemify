import type { ChatMessage, ChatThreadId } from "@/lib/chat/types";
import {
  create_empty_chat,
  delete_chat,
  load_chat,
  save_chat,
  type ChatThreadState,
} from "@/lib/chat-persistence";

const threads = new Map<ChatThreadId, ChatThreadState>();

export function ensure_thread(thread_id: ChatThreadId, mode: "ask" | "build", model: string): ChatThreadState {
  const existing = threads.get(thread_id);
  if (existing) return existing;

  const persisted = load_chat(thread_id);
  if (persisted) {
    threads.set(thread_id, persisted);
    return persisted;
  }

  const created = create_empty_chat(thread_id, mode, model);
  threads.set(thread_id, created);
  return created;
}

export function get_thread(thread_id: ChatThreadId): ChatThreadState {
  const existing = threads.get(thread_id);
  if (existing) return existing;

  const persisted = load_chat(thread_id);
  if (persisted) {
    threads.set(thread_id, persisted);
    return persisted;
  }

  return create_empty_chat(thread_id, "ask", "");
}

export function set_thread(thread_id: ChatThreadId, next: ChatThreadState): void {
  threads.set(thread_id, next);
  save_chat(thread_id, next);
}

export function append_message(thread_id: ChatThreadId, message: ChatMessage): void {
  const state = get_thread(thread_id);
  const updated_messages = [...state.messages, message];
  set_thread(thread_id, { ...state, messages: updated_messages });
}

export function set_is_running(thread_id: ChatThreadId, is_running: boolean): void {
  const state = get_thread(thread_id);
  set_thread(thread_id, { ...state, is_running });
}

export function update_message_content(
  thread_id: ChatThreadId,
  message_id: string,
  append_text: string,
): void {
  const state = get_thread(thread_id);

  const next_messages = state.messages.map((m) => {
    if (m.id !== message_id) return m;
    return { ...m, content: m.content + append_text };
  });

  set_thread(thread_id, { ...state, messages: next_messages });
}

export function replace_message(
  thread_id: ChatThreadId,
  message_id: string,
  next_partial: Partial<ChatMessage>,
): void {
  const state = get_thread(thread_id);

  const next_messages = state.messages.map((m) => {
    if (m.id !== message_id) return m;
    return { ...m, ...next_partial };
  });

  set_thread(thread_id, { ...state, messages: next_messages });
}

export function set_thread_title(thread_id: ChatThreadId, title: string): void {
  const state = get_thread(thread_id);
  set_thread(thread_id, { ...state, title });
}

export function remove_thread(thread_id: ChatThreadId): void {
  threads.delete(thread_id);
  delete_chat(thread_id);
}

export function count_user_messages(thread_id: ChatThreadId): number {
  const state = get_thread(thread_id);
  return state.messages.filter((m) => m.role === "user").length;
}

export function get_first_user_message(thread_id: ChatThreadId): string | null {
  const state = get_thread(thread_id);
  const first_user = state.messages.find((m) => m.role === "user");
  return first_user?.content ?? null;
}

export function has_assistant_responses(thread_id: ChatThreadId): boolean {
  const state = get_thread(thread_id);
  return state.messages.some((m) => m.role === "assistant");
}
