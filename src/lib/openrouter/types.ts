export type OpenRouterModel = {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
};

export type OpenRouterError = {
  error: {
    message: string;
    code?: number | string;
  };
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenRouterStreamDelta = {
  id?: string;
  choices?: Array<{
    delta?: { content?: string };
    finish_reason?: string | null;
  }>;
};
