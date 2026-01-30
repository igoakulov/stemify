"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
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
  const search_input_ref = React.useRef<HTMLInputElement>(null);

  const filtered_groups = React.useMemo(() => {
    if (!search.trim()) return group_options_by_provider(options);
    
    const search_lower = search.toLowerCase();
    const filtered = options.filter(o => 
      o.label.toLowerCase().includes(search_lower) ||
      o.provider.toLowerCase().includes(search_lower)
    );
    
    return group_options_by_provider(filtered);
  }, [options, search]);

  const display_text = selected ? middle_truncate(selected.label, 28) : placeholder;

  return (
    <Select
      value={value}
      onValueChange={(val) => {
        onChange(val);
        set_search("");
        set_open(false);
      }}
      disabled={disabled}
      open={open}
      onOpenChange={(is_open) => {
        set_open(is_open);
        if (!is_open) {
          set_search("");
        }
      }}
    >
      <SelectTrigger
        className={cn(
          "h-8 w-auto border-0 bg-transparent px-2 py-1 text-xs",
          "text-secondary hover:text-primary focus:ring-0 focus:ring-offset-0",
          className
        )}
        style={{ maxWidth: '200px' }}
      >
        <span className={cn("truncate", !selected && "text-placeholder")}>{display_text}</span>
      </SelectTrigger>
      <SelectContent
        className="max-h-80 w-[280px] border-zinc-700 bg-zinc-900"
        position="popper"
        sideOffset={4}
        onKeyDown={(e) => {
          if (search_input_ref.current && e.target !== search_input_ref.current) {
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
              search_input_ref.current.focus();
            }
          }
        }}
      >
        <div className="p-2">
          <input
            ref={search_input_ref}
            type="text"
            placeholder="Search models..."
            value={search}
            onChange={(e) => set_search(e.target.value)}
            className="w-full rounded bg-zinc-800 px-2 py-1 text-xs text-white placeholder:text-placeholder focus:outline-none"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered_groups.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted">No models found</div>
          ) : (
            filtered_groups.map(([provider, models]) => (
              <SelectGroup key={provider}>
                <SelectLabel className="px-2 py-1 text-xs font-semibold text-tertiary">
                  {provider}
                </SelectLabel>
                {models.map((model) => (
                  <SelectItem
                    key={model.value}
                    value={model.value}
                    className="px-2 py-1.5 text-sm text-primary focus:bg-white/10 focus:text-white"
                  >
                    <span className="truncate">{model.label}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
}

function group_options_by_provider(
  options: ModelOption[]
): [string, ModelOption[]][] {
  const by_provider = new Map<string, ModelOption[]>();

  for (const option of options) {
    const existing = by_provider.get(option.provider) || [];
    existing.push(option);
    by_provider.set(option.provider, existing);
  }

  const sorted = [...by_provider.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return sorted.map(([provider, models]) => [
    provider,
    models.sort((a, b) => (b.created ?? 0) - (a.created ?? 0)),
  ]);
}

function middle_truncate(str: string, max_length: number): string {
  if (str.length <= max_length) return str;

  const chars_to_show = max_length - 3;
  const front_chars = Math.ceil(chars_to_show / 2);
  const back_chars = Math.floor(chars_to_show / 2);

  return str.slice(0, front_chars) + "..." + str.slice(str.length - back_chars);
}
