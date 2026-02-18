"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  clear_prompt_override,
  load_prompt_override,
  save_prompt_override,
  type PromptId,
} from "@/lib/prompts/store";
import {
  clear_openrouter_api_key,
  load_openrouter_api_key,
  save_openrouter_api_key,
} from "@/lib/settings/storage";

const PROMPT_INFO: Record<
  PromptId,
  { name: string; description: string; order: number }
> = {
  start: {
    name: "Start",
    description: "Sent at the start of every conversation",
    order: 1,
  },
  api: {
    name: "API Reference",
    description:
      "Sent after Start prompt to teach Assistant how to build scenes",
    order: 2,
  },
  scene: {
    name: "Scene",
    description: "Sent before your message to keep Assistant informed",
    order: 3,
  },
  ask: {
    name: "ASK",
    description: "Sent to signal your intent to just ask a question",
    order: 4,
  },
  build: {
    name: "BUILD",
    description: "Sent to signal your intent to create / update a scene",
    order: 5,
  },
  fix: {
    name: "FIX",
    description: "Sent when fixing validation errors in previous response",
    order: 6,
  },
  title: {
    name: "Title",
    description: "Sent to auto-generate scene title in the background",
    order: 7,
  },
};

export function SettingsDialog() {
  const [is_mounted, set_is_mounted] = useState(false);
  const [open, set_open] = useState(false);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      set_is_mounted(true);
    });

    const handleOpenSettings = () => {
      set_open(true);
    };

    window.addEventListener("stemify:open-settings", handleOpenSettings);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("stemify:open-settings", handleOpenSettings);
    };
  }, []);

  const [api_key_input, set_api_key_input] = useState("");
  const [api_key_message, set_api_key_message] = useState("");

  const stored_api_key = useMemo(() => {
    if (!is_mounted) return "";
    return load_openrouter_api_key();
  }, [is_mounted]);

  const [active_prompt, set_active_prompt] = useState<PromptId>("start");
  const [prompt_drafts, set_prompt_drafts] = useState<Record<PromptId, string>>(
    {
      start: "",
      ask: "",
      build: "",
      title: "",
      api: "",
      scene: "",
      fix: "",
    },
  );
  const [prompt_errors, set_prompt_errors] = useState<Record<PromptId, string>>(
    {
      start: "",
      ask: "",
      build: "",
      title: "",
      api: "",
      scene: "",
      fix: "",
    },
  );
  const [prompt_message, set_prompt_message] = useState("");

  useEffect(() => {
    if (!open) return;

    const raf = window.requestAnimationFrame(async () => {
      for (const pid of [
        "start",
        "ask",
        "build",
        "title",
        "api",
        "scene",
        "fix",
      ] as PromptId[]) {
        const override = load_prompt_override(pid);
        if (override !== null) {
          set_prompt_drafts((prev) => ({ ...prev, [pid]: override }));
          set_prompt_errors((prev) => ({ ...prev, [pid]: "" }));
          continue;
        }

        try {
          const md = await fetch(`/prompts/${pid}.md`, {
            cache: "no-store",
          }).then((r) => {
            if (!r.ok) throw new Error("Failed to load");
            return r.text();
          });
          set_prompt_drafts((prev) => ({ ...prev, [pid]: md }));
          set_prompt_errors((prev) => ({ ...prev, [pid]: "" }));
        } catch (e) {
          set_prompt_errors((prev) => ({
            ...prev,
            [pid]: e instanceof Error ? e.message : "Failed to load",
          }));
        }
      }
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const raf = window.requestAnimationFrame(() => {
      set_api_key_input(stored_api_key);
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [open, stored_api_key]);

  const on_save_key = () => {
    const trimmed = api_key_input.trim();
    save_openrouter_api_key(trimmed);
    if (trimmed) {
      window.dispatchEvent(new Event("stemify:api-key-saved"));
    }
    set_api_key_message("Saved!");
    setTimeout(() => set_api_key_message(""), 1500);
  };

  const on_clear_key = () => {
    clear_openrouter_api_key();
    set_api_key_input("");
    set_api_key_message("Cleared!");
    setTimeout(() => set_api_key_message(""), 1500);
  };

  const on_reset_prompt = (pid: PromptId) => {
    clear_prompt_override(pid);
    fetch(`/prompts/${pid}.md`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.text();
      })
      .then((md) => {
        set_prompt_drafts((prev) => ({ ...prev, [pid]: md }));
        set_prompt_errors((prev) => ({ ...prev, [pid]: "" }));
        set_prompt_message("Reset!");
        setTimeout(() => set_prompt_message(""), 1500);
      })
      .catch((e) => {
        set_prompt_errors((prev) => ({
          ...prev,
          [pid]: e instanceof Error ? e.message : "Failed",
        }));
      });
  };

  const on_save_prompt = (pid: PromptId) => {
    const trimmed = prompt_drafts[pid].trim();
    if (trimmed.length === 0) {
      set_prompt_errors((prev) => ({
        ...prev,
        [pid]: "Prompt cannot be empty.",
      }));
      return;
    }
    save_prompt_override(pid, prompt_drafts[pid]);
    set_prompt_errors((prev) => ({ ...prev, [pid]: "" }));
    set_prompt_message("Saved!");
    setTimeout(() => set_prompt_message(""), 1500);
  };

  if (!is_mounted) return null;

  return (
    <Dialog open={open} onOpenChange={set_open}>
      <DialogContent className="max-w-2xl bg-white text-zinc-950">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="text-sm font-medium">OpenRouter API KEY</div>
            <Input
              value={api_key_input}
              placeholder="sk-or-..."
              onChange={(e) => set_api_key_input(e.target.value)}
              type="password"
              autoComplete="off"
            />
            <div className="text-xs text-muted-foreground">
              Local-only: your key is stored in your browser and never logged.
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button type="button" size="sm" onClick={on_save_key}>
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={on_clear_key}
              >
                Clear
              </Button>
              {api_key_message && (
                <span className="text-sm text-green-600 animate-in fade-in">
                  {api_key_message}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">System prompts</div>

            <Select
              value={active_prompt}
              onValueChange={(value) => set_active_prompt(value as PromptId)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select prompt" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-zinc-200 shadow-lg">
                {(
                  [
                    "start",
                    "api",
                    "scene",
                    "ask",
                    "build",
                    "fix",
                    "title",
                  ] as PromptId[]
                )
                  .sort((a, b) => PROMPT_INFO[a].order - PROMPT_INFO[b].order)
                  .map((pid) => (
                    <SelectItem key={pid} value={pid} className="text-sm">
                      {PROMPT_INFO[pid].name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                {PROMPT_INFO[active_prompt].description}
              </div>
              <Textarea
                value={prompt_drafts[active_prompt]}
                onChange={(e) =>
                  set_prompt_drafts((prev) => ({
                    ...prev,
                    [active_prompt]: e.target.value,
                  }))
                }
                className="min-h-48 max-h-64 whitespace-pre-wrap font-mono text-xs"
              />
              {prompt_errors[active_prompt] && (
                <div className="text-xs text-red-400">
                  {prompt_errors[active_prompt]}
                </div>
              )}
              <div className="flex items-center gap-2">
                {prompt_message && (
                  <span className="text-sm text-green-600 animate-in fade-in">
                    {prompt_message}
                  </span>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => on_reset_prompt(active_prompt)}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => on_save_prompt(active_prompt)}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
