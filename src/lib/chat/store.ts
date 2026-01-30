import type { ChatMessage, ChatThreadId } from "@/lib/chat/types";

export type ChatThreadState = {
  messages: ChatMessage[];
  is_running: boolean;
};

const threads = new Map<ChatThreadId, ChatThreadState>();

export function ensure_thread(thread_id: ChatThreadId): void {
  get_thread(thread_id);
}

export function get_thread(thread_id: ChatThreadId): ChatThreadState {
  const existing = threads.get(thread_id);
  if (existing) return existing;

  const created: ChatThreadState = {
    messages: [],
    is_running: false,
  };

  threads.set(thread_id, created);
  return created;
}

export function set_thread(thread_id: ChatThreadId, next: ChatThreadState): void {
  threads.set(thread_id, next);
}

export function append_message(thread_id: ChatThreadId, message: ChatMessage): void {
  const state = get_thread(thread_id);
  set_thread(thread_id, { ...state, messages: [...state.messages, message] });
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
