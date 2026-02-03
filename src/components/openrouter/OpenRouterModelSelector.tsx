"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ModelSelector,
  type ModelOption,
} from "@/components/openrouter/ModelSelector";
import {
  load_openrouter_model_id,
  save_openrouter_model_id,
} from "@/lib/settings/storage";
import { list_openrouter_models } from "@/lib/openrouter/client";
import type { OpenRouterModel } from "@/lib/openrouter/types";

const DEFAULT_MODEL_ID = "openrouter/free";

export function OpenRouterModelSelector() {
  const [is_mounted, set_is_mounted] = useState(false);
  const [models, set_models] = useState<OpenRouterModel[]>([]);
  const [loading, set_loading] = useState(true);

  const [model_id, set_model_id] = useState<string>("");

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      set_is_mounted(true);
      set_model_id(load_openrouter_model_id());
    });

    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!is_mounted) return;

    let cancelled = false;

    list_openrouter_models("")
      .then((data) => {
        if (cancelled) return;

        const model_ids = new Set(data.map((m) => m.id));
        set_models(data);

        const saved_model_id = load_openrouter_model_id();

        if (saved_model_id === "") {
          if (model_ids.has(DEFAULT_MODEL_ID)) {
            set_model_id(DEFAULT_MODEL_ID);
            save_openrouter_model_id(DEFAULT_MODEL_ID);
          }
        } else if (!model_ids.has(saved_model_id)) {
          set_model_id("");
          save_openrouter_model_id("");
        }

        set_loading(false);
      })
      .catch(() => {
        if (cancelled) return;

        set_models([]);
        set_loading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [is_mounted]);

  const options = useMemo<ModelOption[]>(() => {
    const unique_by_id = new Map<string, OpenRouterModel>();
    for (const m of models) {
      unique_by_id.set(m.id, m);
    }

    unique_by_id.delete("openrouter/auto");

    const model_options: ModelOption[] = [...unique_by_id.values()].map((m) => {
      const parts = m.id.split("/");
      const provider = parts[0] || "Other";
      const model_name = parts.slice(1).join("/") || m.name || m.id;

      return {
        value: m.id,
        label: model_name,
        provider: format_provider_name(provider),
        created: m.created ?? 0,
      };
    });

    return model_options;
  }, [models]);

  return loading ? null : (
    <ModelSelector
      value={model_id}
      options={options}
      placeholder="Select model"
      onClose={() => {
        window.dispatchEvent(new Event("stemify:model-selector-closed"));
      }}
      onChange={(next) => {
        if (!next) return;
        set_model_id(next);
        save_openrouter_model_id(next);
      }}
    />
  );
}

function format_provider_name(provider: string): string {
  const formatted = provider
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const special_cases: Record<string, string> = {
    Openai: "OpenAI",
    Anthropic: "Anthropic",
    Google: "Google",
    Mistralai: "Mistral AI",
    Cohere: "Cohere",
    Perplexity: "Perplexity",
    Fireworks: "Fireworks",
    Together: "Together",
    Azure: "Azure",
    Aws: "AWS",
  };

  return special_cases[formatted] || formatted;
}
