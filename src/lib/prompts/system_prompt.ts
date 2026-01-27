import {
  clear_prompt_override,
  load_prompt_override,
  save_prompt_override,
} from "@/lib/prompts/store";

const SYSTEM_PROMPT_URL = "/prompts/system_prompt.md";

export async function load_default_system_prompt_md(): Promise<string> {
  const res = await fetch(SYSTEM_PROMPT_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load system prompt");
  }

  return res.text();
}

export function load_system_prompt_override(): string | null {
  return load_prompt_override("system");
}

export function save_system_prompt_override(markdown: string): void {
  save_prompt_override("system", markdown);
}

export function clear_system_prompt_override(): void {
  clear_prompt_override("system");
}

export async function load_effective_system_prompt_md(): Promise<string> {
  const override = load_system_prompt_override();
  if (override !== null) return override;
  return load_default_system_prompt_md();
}
