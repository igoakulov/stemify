import type { ReactNode } from "react";
import type { SavedScene } from "@/lib/scene/store";

export type BannerType = "error" | "warning" | "suggestion";

export type BannerAction = {
  label: string;
  onClick: () => void;
};

export type BannerState = {
  type: BannerType;
  title?: string;
  message: ReactNode;
  actions?: BannerAction[];
  dismissable?: boolean;
} | null;

let current_banner: BannerState = null;
const listeners: Set<() => void> = new Set();

export function get_banner(): BannerState {
  return current_banner;
}

export function set_banner(banner: BannerState): void {
  current_banner = banner;
  listeners.forEach((listener) => listener());
}

export function clear_banner(): void {
  current_banner = null;
  listeners.forEach((listener) => listener());
}

export function subscribe_banner(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type RetryContext = {
  thread_id: string;
  user_message: string;
  error_message: string;
  invalid_json?: string;
  scene: SavedScene;
  mode: "ask" | "build" | "fix";
};

let last_error: RetryContext | null = null;
let fix_mode_active = false;

export function set_fix_mode(active: boolean): void {
  fix_mode_active = active;
}

export function is_fix_mode(): boolean {
  return fix_mode_active;
}

export function prepare_error_context(context: RetryContext): void {
  last_error = context;
}

export function get_error_context(): RetryContext | null {
  return last_error;
}

export function clear_error_context(): void {
  last_error = null;
}

export function create_retry_action(): BannerAction {
  return {
    label: "Redo",
    onClick: () => {
      window.dispatchEvent(new CustomEvent("stemify:retry-failed"));
    },
  };
}

export function show_error(
  message: ReactNode,
  options?: {
    title?: string;
    actions?: BannerAction[];
    dismissable?: boolean;
  },
): void {
  set_banner({
    type: "error",
    message,
    title: options?.title,
    actions: options?.actions,
    dismissable: options?.dismissable ?? true,
  });
}

export function show_warning(
  message: ReactNode,
  options?: {
    title?: string;
    actions?: BannerAction[];
    dismissable?: boolean;
  },
): void {
  set_banner({
    type: "warning",
    message,
    title: options?.title,
    actions: options?.actions,
    dismissable: options?.dismissable ?? true,
  });
}

export function show_suggestion(
  message: ReactNode,
  options?: {
    title?: string;
    actions?: BannerAction[];
  },
): void {
  set_banner({
    type: "suggestion",
    message,
    title: options?.title,
    actions: options?.actions,
    dismissable: false,
  });
}

export type BannerConfig = {
  message: ReactNode;
  title?: string;
  actions?: BannerAction[];
  dismissable?: boolean;
};

export const BANNERS: {
  API_KEY_NEEDED: BannerConfig;
  OPENROUTER_ERROR: (errorMessage: string) => BannerConfig;
  INVALID_SCENE_CODE: BannerConfig;
  PERFORMANCE_WARNING: (details: string) => BannerConfig;
  WELCOME_SETUP: BannerConfig;
  GENERIC_ERROR: (message: string) => BannerConfig;
} = {
  API_KEY_NEEDED: {
    message: (
      <>
        Please add your{" "}
        <a
          href="https://openrouter.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          OpenRouter
        </a>{" "}
        API key in Settings to send messages.
      </>
    ),
    title: "API Key Needed",
    actions: [
      {
        label: "Add API key",
        onClick: () => {
          window.dispatchEvent(new CustomEvent("stemify:open-settings"));
        },
      },
    ],
  },

  OPENROUTER_ERROR: (errorMessage: string) => ({
    message: `Failed to get response from OpenRouter: ${errorMessage}`,
    title: "OpenRouter Error",
  }),

  INVALID_SCENE_CODE: {
    message:
      "Assistant's scene code has an issue. Click redo or try a new prompt.",
    title: "Scene Code Issue",
    actions: [create_retry_action()],
  },

  PERFORMANCE_WARNING: (details: string) => ({
    message: `Scene performance warning: ${details}`,
    title: "Performance",
  }),

  WELCOME_SETUP: {
    message: (
      <>
        To start chatting, add your{" "}
        <a
          href="https://openrouter.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          OpenRouter
        </a>{" "}
        API key. It is stored locally in your browser and never leaves your
        device.
      </>
    ),
    title: "Welcome! Let's get you set up",
    actions: [
      {
        label: "Add API key",
        onClick: () => {
          window.dispatchEvent(new CustomEvent("stemify:open-settings"));
        },
      },
    ],
  },

  GENERIC_ERROR: (message: string) => ({
    message,
    title: "Error",
  }),
};
