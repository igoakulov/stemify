export type PromptId = "start" | "ask" | "build";

const PROMPT_OVERRIDES_KEY = "stemify.prompts.overrides.v1";

type OverridesState = Partial<Record<PromptId, string>>;

function load_overrides_state(): OverridesState {
  try {
    const raw = window.localStorage.getItem(PROMPT_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as OverridesState;
  } catch {
    return {};
  }
}

function save_overrides_state(state: OverridesState): void {
  window.localStorage.setItem(PROMPT_OVERRIDES_KEY, JSON.stringify(state));
}

export function load_prompt_override(prompt_id: PromptId): string | null {
  const state = load_overrides_state();
  return state[prompt_id] ?? null;
}

export function save_prompt_override(prompt_id: PromptId, markdown: string): void {
  const state = load_overrides_state();
  state[prompt_id] = markdown;
  save_overrides_state(state);
}

export function clear_prompt_override(prompt_id: PromptId): void {
  const state = load_overrides_state();
  delete state[prompt_id];
  save_overrides_state(state);
}
