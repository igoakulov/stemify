"use client";

import { type FC } from "react";
import { KeyboardShortcut } from "@/components/ui/keyboard-shortcut";
import { GridToggle } from "@/components/GridToggle";
import { cn } from "@/lib/utils";

type SceneToolbarProps = {
  onResetCamera: () => void;
  onGoHome?: () => void;
  gridSnap?: boolean;
  onGridChange?: (enabled: boolean) => void;
  className?: string;
};

export const SceneToolbar: FC<SceneToolbarProps> = ({
  onResetCamera,
  onGoHome,
  gridSnap = true,
  onGridChange,
  className,
}) => {
  return (
    <div
      className={cn(
        "absolute top-2 left-2 z-10 flex items-center gap-2",
        className,
      )}
    >
      {/* Main toolbar - transparent background */}
      <div className="flex items-center gap-1 rounded-outer p-2">
        {/* Stemify logo */}
        <button
          type="button"
          onClick={onGoHome}
          className="text-sm font-semibold text-white/80 tracking-tight px-1 select-none hover:text-white transition-colors cursor-pointer"
        >
          Stemify
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* R shortcut and snap toggle */}
        <div className="flex items-center gap-2">
          <KeyboardShortcut
            keys={["R"]}
            onTrigger={onResetCamera}
            shortcutId="scene-reset"
            className="border border-white/5 bg-white/5"
          />
          <span className="text-[10px] text-white/50">reset</span>
          <GridToggle enabled={gridSnap} onToggle={onGridChange} />
        </div>
      </div>
    </div>
  );
};
