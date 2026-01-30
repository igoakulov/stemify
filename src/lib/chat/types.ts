export type ChatThreadId = string;

export type ChatMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  created_at: number;
  meta?: {
    mode?: "ask" | "build";
    model_id?: string;
  };
};
