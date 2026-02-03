"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ModelOption = {
  value: string;
  label: string;
  provider: string;
  created?: number;
};

type ModelSelectorProps = {
  value: string;
  options: ModelOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function ModelSelector({
  value,
  options,
  placeholder = "Select model",
  onChange,
  disabled,
  className,
}: ModelSelectorProps) {
  const selected = options.find((o) => o.value === value);
  const [search, set_search] = React.useState("");
  const [open, set_open] = React.useState(false);
  const [highlighted_index, set_highlighted_index] = React.useState(-1);
  const search_input_ref = React.useRef<HTMLInputElement>(null);
  const list_container_ref = React.useRef<HTMLDivElement>(null);
  const item_refs = React.useRef<Map<number, HTMLDivElement>>(new Map());

  const flat_filtered_options = React.useMemo(() => {
    if (!search.trim()) return options;
    const search_lower = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(search_lower) ||
        o.provider.toLowerCase().includes(search_lower),
    );
  }, [options, search]);

  const filtered_groups = React.useMemo(() => {
    return group_options_by_provider(flat_filtered_options);
  }, [flat_filtered_options]);

  const display_text = selected
    ? selected.label.length > 20
      ? selected.label.slice(0, 20) + "…"
      : selected.label
    : placeholder;

  // Reset highlighted index when search changes
  React.useEffect(() => {
    set_highlighted_index(flat_filtered_options.length > 0 ? 0 : -1);
  }, [flat_filtered_options.length, search]);

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlighted_index >= 0 && list_container_ref.current) {
      const highlighted_el = item_refs.current.get(highlighted_index);
      if (highlighted_el) {
        const container = list_container_ref.current;
        const container_rect = container.getBoundingClientRect();
        const el_rect = highlighted_el.getBoundingClientRect();

        if (el_rect.top < container_rect.top) {
          container.scrollTop -= container_rect.top - el_rect.top;
        } else if (el_rect.bottom > container_rect.bottom) {
          container.scrollTop += el_rect.bottom - container_rect.bottom;
        }
      }
    }
  }, [highlighted_index]);

  const handle_key_down = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();

    if (e.key === "Escape") {
      set_open(false);
      return;
    }

    if (flat_filtered_options.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      set_highlighted_index((prev) => {
        const next = prev < flat_filtered_options.length - 1 ? prev + 1 : prev;
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      set_highlighted_index((prev) => {
        const next = prev > 0 ? prev - 1 : 0;
        return next;
      });
    } else if (e.key === "Enter" && highlighted_index >= 0) {
      e.preventDefault();
      const selected_model = flat_filtered_options[highlighted_index];
      if (selected_model) {
        onChange(selected_model.value);
        set_search("");
        set_open(false);
      }
    }
  };

  const handle_select = (model_value: string) => {
    onChange(model_value);
    set_search("");
    set_open(false);
  };

  let current_index = 0;

  return (
    <Select
      value={value}
      onValueChange={handle_select}
      disabled={disabled}
      open={open}
      onOpenChange={(is_open) => {
        set_open(is_open);
        if (!is_open) {
          set_search("");
          set_highlighted_index(-1);
          setTimeout(() => {
            search_input_ref.current?.blur();
          }, 0);
        } else {
          setTimeout(() => {
            search_input_ref.current?.focus();
            set_highlighted_index(flat_filtered_options.length > 0 ? 0 : -1);
          }, 0);
        }
      }}
    >
      <SelectTrigger
        className={cn(
          "h-8 w-auto border-0 bg-transparent px-2 py-1 text-xs",
          "text-secondary hover:text-primary focus:ring-0 focus:ring-offset-0",
          className,
        )}
        style={{ maxWidth: "200px" }}
      >
        <SelectValue placeholder={placeholder}>
          <span className={cn("truncate", !selected && "text-placeholder")}>
            {display_text}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className="max-h-80 w-[360px] border-zinc-700 bg-zinc-900 p-0"
        position="popper"
        sideOffset={4}
      >
        <input
          ref={search_input_ref}
          type="text"
          placeholder="Search models..."
          value={search}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          onChange={(e) => set_search(e.target.value)}
          className="w-full bg-transparent px-2 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handle_key_down}
        />
        <div ref={list_container_ref} className="max-h-64 overflow-y-auto p-2 pt-0">
          {filtered_groups.length === 0 ? (
            <div className="px-2 py-4 text-xs text-zinc-500 text-center">
              No models found
            </div>
          ) : (
            filtered_groups.map(([provider, models]) => (
              <SelectGroup key={provider}>
                <SelectLabel className="px-2 py-1 text-xs font-semibold text-zinc-500">
                  {provider}
                </SelectLabel>
                {models.map((model) => {
                  const index = current_index++;
                  const is_highlighted = index === highlighted_index;

                  return (
                    <div
                      key={model.value}
                      ref={(el) => {
                        if (el) item_refs.current.set(index, el);
                      }}
                      onClick={() => handle_select(model.value)}
                      onMouseEnter={() => set_highlighted_index(index)}
                      className={cn(
                        "px-2 py-1.5 text-sm cursor-pointer flex items-center justify-between",
                        is_highlighted
                          ? "bg-white/10 text-white"
                          : "text-zinc-300 hover:bg-white/5",
                      )}
                    >
                      <span className="truncate">{model.label}</span>
                      {model.value === value && (
                        <span className="ml-2 text-xs text-zinc-500">✓</span>
                      )}
                    </div>
                  );
                })}
              </SelectGroup>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
}

function group_options_by_provider(
  options: ModelOption[],
): [string, ModelOption[]][] {
  const by_provider = new Map<string, ModelOption[]>();

  for (const option of options) {
    const existing = by_provider.get(option.provider) || [];
    existing.push(option);
    by_provider.set(option.provider, existing);
  }

  const sorted = [...by_provider.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  return sorted.map(([provider, models]) => [
    provider,
    models.sort((a, b) => (b.created ?? 0) - (a.created ?? 0)),
  ]);
}
