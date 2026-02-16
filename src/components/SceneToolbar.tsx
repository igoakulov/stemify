"use client";

import { type FC, useEffect, useRef, useState } from "react";
import { KeyboardShortcut } from "@/components/ui/keyboard-shortcut";
import { GridToggle } from "@/components/GridToggle";
import { cn } from "@/lib/utils";

type SceneToolbarProps = {
  onResetCamera: () => void;
  onGoHome?: () => void;
  gridSnap?: boolean;
  onGridChange?: (enabled: boolean) => void;
  selectedObjectId?: string | null;
  onDrillUp?: () => void;
  onDrillDown?: () => void;
  canDrillUp?: boolean;
  canDrillDown?: boolean;
  className?: string;
};

export const SceneToolbar: FC<SceneToolbarProps> = ({
  onResetCamera,
  onGoHome,
  gridSnap = true,
  onGridChange,
  selectedObjectId = null,
  onDrillUp,
  onDrillDown,
  canDrillUp = false,
  canDrillDown = false,
  className,
}) => {
  const [flashUp, setFlashUp] = useState(false);
  const [flashDown, setFlashDown] = useState(false);
  const prevCanDrillUp = useRef(canDrillUp);
  const prevCanDrillDown = useRef(canDrillDown);

  // Flash animation effects - only flash when drill becomes available
  useEffect(() => {
    if (canDrillUp && !prevCanDrillUp.current) {
      // Use setTimeout to avoid synchronous setState in effect
      const flashTimer = setTimeout(() => setFlashUp(true), 0);
      const clearTimer = setTimeout(() => setFlashUp(false), 300);
      return () => {
        clearTimeout(flashTimer);
        clearTimeout(clearTimer);
      };
    }
    prevCanDrillUp.current = canDrillUp;
  }, [canDrillUp]);

  useEffect(() => {
    if (canDrillDown && !prevCanDrillDown.current) {
      // Use setTimeout to avoid synchronous setState in effect
      const flashTimer = setTimeout(() => setFlashDown(true), 0);
      const clearTimer = setTimeout(() => setFlashDown(false), 300);
      return () => {
        clearTimeout(flashTimer);
        clearTimeout(clearTimer);
      };
    }
    prevCanDrillDown.current = canDrillDown;
  }, [canDrillDown]);

  return (
    <div
      className={cn(
        "absolute top-2 left-2 z-10 flex items-center gap-2",
        className,
      )}
    >
      <div className="flex items-center gap-1 rounded-outer p-2">
        <button
          type="button"
          onClick={onGoHome}
          className="text-sm font-semibold text-white/80 tracking-tight px-1 select-none hover:text-white transition-colors cursor-pointer"
        >
          Stemify
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        <div className="flex items-center gap-3 px-1">
          <GridToggle enabled={gridSnap} onToggle={onGridChange} />

          <div className="flex items-center gap-1">
            <KeyboardShortcut
              keys={["R"]}
              onTrigger={onResetCamera}
              shortcutId="scene-reset"
              className="border border-white/5 bg-white/5"
            />
            <span className="text-[10px] text-white/50">reset</span>
          </div>

          {selectedObjectId && (
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1">
                {canDrillUp && (
                  <KeyboardShortcut
                    keys={["["]}
                    onTrigger={onDrillUp ?? (() => {})}
                    shortcutId="drill-up"
                    className={cn(
                      "border border-white/5 bg-white/5",
                      flashUp && "!bg-amber-400/20 !text-amber-400 !border-amber-400/30"
                    )}
                    enabled={canDrillUp}
                  />
                )}
                {canDrillDown && (
                  <KeyboardShortcut
                    keys={["]"]}
                    onTrigger={onDrillDown ?? (() => {})}
                    shortcutId="drill-down"
                    className={cn(
                      "border border-white/5 bg-white/5",
                      flashDown && "!bg-amber-400/20 !text-amber-400 !border-amber-400/30"
                    )}
                    enabled={canDrillDown}
                  />
                )}
              </div>
              {(canDrillUp || canDrillDown) && (
                <span className="text-[10px] text-white/50">drill up/down</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
