"use client";

import { useState, useEffect, useCallback, type FC, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Modifier key icons mapping
const MODIFIER_ICONS: Record<string, ReactNode> = {
  cmd: (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 9a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 0v12m6-12a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 0v12" />
    </svg>
  ),
  ctrl: <span className="text-[10px] font-bold">⌃</span>,
  shift: <span className="text-[10px] font-bold">⇧</span>,
  alt: <span className="text-[10px] font-bold">⌥</span>,
  option: <span className="text-[10px] font-bold">⌥</span>,
  enter: <span className="text-[10px] font-bold">↵</span>,
  return: <span className="text-[10px] font-bold">↵</span>,
  delete: <span className="text-[10px] font-bold">⌫</span>,
  backspace: <span className="text-[10px] font-bold">⌫</span>,
  esc: <span className="text-[10px]">esc</span>,
  tab: <span className="text-[10px]">Tab</span>,
};

type KeyboardShortcutProps = {
  keys: string[];
  label?: string;
  onTrigger: () => void;
  className?: string;
  shortcutId?: string;
  enabled?: boolean;
  disableOnInput?: boolean;
  asChild?: boolean;
  forceActive?: boolean;
};

export const KeyboardShortcut: FC<KeyboardShortcutProps> = ({
  keys,
  label,
  onTrigger,
  className,
  shortcutId,
  enabled = true,
  disableOnInput = true,
  asChild = false,
  forceActive = false,
}) => {
  const [isActive, setIsActive] = useState(false);
  
  // Combine internal active state with forced active state from parent
  const isVisuallyActive = isActive || forceActive;

  // Centralized trigger function - used by both click and keyboard
  const trigger = useCallback(() => {
    if (!enabled) return;
    
    setIsActive(true);
    setTimeout(() => setIsActive(false), 150);
    onTrigger();
  }, [enabled, onTrigger]);

  // Listen for keyboard shortcut
  useEffect(() => {
    if (!shortcutId || !enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we should disable when typing in input fields
      if (disableOnInput) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest("[contenteditable]")
        ) {
          return;
        }
      }

      const normalizedKeys = keys.map((k) => k.toLowerCase());
      const pressedKeys: string[] = [];

      if (e.metaKey || e.ctrlKey) pressedKeys.push("cmd");
      if (e.altKey) pressedKeys.push("alt");
      if (e.shiftKey) pressedKeys.push("shift");
      if (e.ctrlKey && !e.metaKey) pressedKeys.push("ctrl");

      const key = e.key.toLowerCase();
      if (!["meta", "control", "alt", "shift"].includes(key)) {
        pressedKeys.push(key);
      }

      const match = normalizedKeys.every((k) =>
        pressedKeys.includes(k) || pressedKeys.includes(k.replace("cmd", "meta"))
      );

      if (match && pressedKeys.length === normalizedKeys.length) {
        e.preventDefault();
        trigger();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keys, trigger, shortcutId, enabled, disableOnInput]);

  const renderKey = (key: string) => {
    const normalizedKey = key.toLowerCase();
    const icon = MODIFIER_ICONS[normalizedKey];

    if (icon) {
      return (
        <span className="flex items-center justify-center">{icon}</span>
      );
    }

    return <span className="text-[10px] font-medium uppercase">{key}</span>;
  };

  const handleClick = () => {
    trigger();
  };

  // Hide when disabled
  if (!enabled) {
    return null;
  }

  const content = (
    <>
      <span className="flex items-center gap-0.5">
        {keys.map((key, index) => (
          <span key={index} className="flex items-center">
            {renderKey(key)}
            {index < keys.length - 1 && (
              <span className="mx-0.5 text-white/30">+</span>
            )}
          </span>
        ))}
      </span>
      {label && (
        <span className="text-[10px] text-white/40 ml-1">{label}</span>
      )}
    </>
  );

  // Base styles - always applied
  const baseStyles = "inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-all duration-150"
  
  // Hover styles - applied on hover OR when active
  const hoverStyles = "hover:bg-white/10 hover:text-white/80 hover:border-white/10"
  
  // Active state styles - hover colors + scale
  const activeStyles = isVisuallyActive 
    ? "bg-white/10 text-white/80 border-white/10 scale-95" 
    : "bg-white/5 text-white/50 border-white/5"

  if (asChild) {
    const handleSpanClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // Stop bubbling to parent button
      e.preventDefault(); // Keep input focused
      trigger();
    };

    return (
      <span
        onMouseDown={(e) => e.preventDefault()} // Prevent focus loss on mousedown
        onClick={handleSpanClick}
        className={cn(baseStyles, hoverStyles, activeStyles, "cursor-pointer", className)}
        title={label}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(baseStyles, hoverStyles, className, activeStyles, "focus:outline-none")}
      title={label}
    >
      {content}
    </button>
  );
};

// Hook to register global keyboard shortcuts
type ShortcutConfig = {
  id: string;
  keys: string[];
  action: () => void;
  description?: string;
  enabled?: boolean;
};

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("[contenteditable]")
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        const normalizedKeys = shortcut.keys.map((k) => k.toLowerCase());
        const pressedKeys: string[] = [];

        if (e.metaKey || e.ctrlKey) pressedKeys.push("cmd");
        if (e.altKey) pressedKeys.push("alt");
        if (e.shiftKey) pressedKeys.push("shift");
        if (e.ctrlKey && !e.metaKey) pressedKeys.push("ctrl");

        const key = e.key.toLowerCase();
        if (!["meta", "control", "alt", "shift"].includes(key)) {
          pressedKeys.push(key);
        }

        const match = normalizedKeys.every((k) =>
          pressedKeys.includes(k) || pressedKeys.includes(k.replace("cmd", "meta"))
        );

        if (match && pressedKeys.length === normalizedKeys.length) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
