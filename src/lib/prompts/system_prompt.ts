import {
  clear_prompt_override,
  load_prompt_override,
  save_prompt_override,
  type PromptId,
} from "@/lib/prompts/store";

const PROMPT_URLS: Record<PromptId, string> = {
  start: "/prompts/start.md",
  ask: "/prompts/ask.md",
  build: "/prompts/build.md",
};

export async function load_default_prompt_md(prompt_id: PromptId): Promise<string> {
  const url = PROMPT_URLS[prompt_id];
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load ${prompt_id} prompt`);
  }
  return res.text();
}

export function load_prompt_override_by_id(prompt_id: PromptId): string | null {
  return load_prompt_override(prompt_id);
}

export function save_prompt_override_by_id(prompt_id: PromptId, markdown: string): void {
  save_prompt_override(prompt_id, markdown);
}

export function clear_prompt_override_by_id(prompt_id: PromptId): void {
  clear_prompt_override(prompt_id);
}

export async function load_effective_prompt_md(prompt_id: PromptId): Promise<string> {
  const override = load_prompt_override_by_id(prompt_id);
  if (override !== null) return override;
  return load_default_prompt_md(prompt_id);
}

export async function load_effective_system_prompt_md(): Promise<string> {
  return load_effective_prompt_md("start");
}
