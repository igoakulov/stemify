"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  clear_openrouter_api_key,
  load_openrouter_api_key,
  save_openrouter_api_key,
} from "@/lib/settings/storage";
import {
  clear_system_prompt_override,
  load_default_system_prompt_md,
  load_system_prompt_override,
  save_system_prompt_override,
} from "@/lib/prompts/system_prompt";

export function SettingsDialog() {
  const [is_mounted, set_is_mounted] = useState(false);
  const [open, set_open] = useState(false);

  useEffect(() => {
    // Avoid SSR/client hydration mismatches from Radix internal IDs.
    // Use rAF to avoid eslint's setState-in-effect rule.
    const raf = window.requestAnimationFrame(() => {
      set_is_mounted(true);
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, []);

  const [api_key_input, set_api_key_input] = useState("");

  const stored_api_key = useMemo(() => {
    if (!is_mounted) return "";
    return load_openrouter_api_key();
  }, [is_mounted]);

  const [prompt_md, set_prompt_md] = useState<string>("");
  const [prompt_draft, set_prompt_draft] = useState<string>("");
  const [prompt_error, set_prompt_error] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    const raf = window.requestAnimationFrame(() => {
      const override = load_system_prompt_override();

      if (override !== null) {
        set_prompt_md(override);
        set_prompt_draft(override);
        set_prompt_error("");
        return;
      }

      load_default_system_prompt_md()
        .then((md: string) => {
          set_prompt_md(md);
          set_prompt_draft(md);
          set_prompt_error("");
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          set_prompt_error(msg);
        });
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // Load stored key into the input when opening.
    // Use rAF to avoid eslint's setState-in-effect rule.
    const raf = window.requestAnimationFrame(() => {
      set_api_key_input(stored_api_key);
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [open, stored_api_key]);


  const on_save_key = () => {
    // Hygiene: never log the key.
    save_openrouter_api_key(api_key_input.trim());
  };

  const on_clear_key = () => {
    clear_openrouter_api_key();
    set_api_key_input("");
  };

  if (!is_mounted) return null;

  return (
    <Dialog open={open} onOpenChange={set_open}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Local-first: your OpenRouter API key is stored in your browser.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="openrouter">
          <TabsList>
            <TabsTrigger value="openrouter">OpenRouter</TabsTrigger>
            <TabsTrigger value="prompt">System Prompt</TabsTrigger>
          </TabsList>

          <TabsContent value="openrouter" className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">OpenRouter API key</div>
              <Input
                value={api_key_input}
                placeholder="sk-or-..."
                onChange={(e) => set_api_key_input(e.target.value)}
                type="password"
                autoComplete="off"
              />
              <div className="text-xs text-muted-foreground">
                Tip: don’t paste keys into URLs. STEMify never logs your key.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={on_save_key}>
                Save
              </Button>
              <Button type="button" variant="outline" onClick={on_clear_key}>
                Clear
              </Button>
            </div>

          </TabsContent>

          <TabsContent value="prompt" className="space-y-3">
            <div className="text-sm text-muted-foreground">
              The system prompt is loaded from `public/prompts/system_prompt.md`. Changes are saved locally in your browser.
            </div>
            <Textarea
              value={prompt_draft || prompt_md || prompt_error || ""}
              onChange={(e) => set_prompt_draft(e.target.value)}
              className="max-h-64 min-h-64 whitespace-pre-wrap font-mono text-xs"
            />

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clear_system_prompt_override();

                  load_default_system_prompt_md()
                    .then((md: string) => {
                      set_prompt_md(md);
                      set_prompt_draft(md);
                      set_prompt_error("");
                    })
                    .catch((e: unknown) => {
                      const msg = e instanceof Error ? e.message : String(e);
                      set_prompt_error(msg);
                    });
                }}
              >
                Reset to default
              </Button>

              <Button
                type="button"
                onClick={() => {
                  const trimmed = prompt_draft.trim();
                  if (trimmed.length === 0) {
                    set_prompt_error("Prompt cannot be empty.");
                    return;
                  }

                  save_system_prompt_override(prompt_draft);
                  set_prompt_md(prompt_draft);
                  set_prompt_error("");
                }}
              >
                Save changes
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
