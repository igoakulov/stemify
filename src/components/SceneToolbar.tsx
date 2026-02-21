"use client";

import { type FC } from "react";
import { Move, MousePointer2 } from "lucide-react";
import { KeyboardShortcut } from "@/components/ui/keyboard-shortcut";
import { GridToggle } from "@/components/GridToggle";
import { cn } from "@/lib/utils";
import { type CameraMode } from "@/lib/scene/camera_mode";

type SceneToolbarProps = {
  onResetCamera: () => void;
  onGoHome?: () => void;
  gridSnap?: boolean;
  onGridChange?: (enabled: boolean) => void;
  onDrillUp?: () => void;
  onDrillDown?: () => void;
  cameraMode?: CameraMode;
  onCameraModeChange?: (mode: CameraMode) => void;
  className?: string;
};

export const SceneToolbar: FC<SceneToolbarProps> = ({
  onResetCamera,
  onGoHome,
  gridSnap = true,
  onGridChange,
  onDrillUp,
  onDrillDown,
  cameraMode = "rotate",
  onCameraModeChange,
  className,
}) => {
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
            <button
              type="button"
              onClick={() => onCameraModeChange?.(cameraMode === "rotate" ? "fly" : "rotate")}
              className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded transition-all duration-150",
                "border text-[10px]",
                cameraMode === "rotate"
                  ? "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                  : "bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
              )}
              title={cameraMode === "rotate" ? "Switch to Fly mode (WASD)" : "Switch to Rotate mode"}
            >
              {cameraMode === "rotate" ? (
                <>
                  <MousePointer2 className="w-3 h-3" />
                  <span>rotate</span>
                </>
              ) : (
                <>
                  <Move className="w-3 h-3" />
                  <span>fly</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <KeyboardShortcut
              keys={["R"]}
              onTrigger={onResetCamera}
              shortcutId="scene-reset"
              className="border border-white/5 bg-white/5"
            />
            <span className="text-[10px] text-white/50">reset</span>
          </div>

          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1">
              <KeyboardShortcut
                keys={["["]}
                onTrigger={onDrillUp ?? (() => {})}
                shortcutId="drill-up"
                className="border border-white/5 bg-white/5"
              />
              <KeyboardShortcut
                keys={["]"]}
                onTrigger={onDrillDown ?? (() => {})}
                shortcutId="drill-down"
                className="border border-white/5 bg-white/5"
              />
            </div>
            <span className="text-[10px] text-white/50">drill up/down</span>
          </div>
        </div>
      </div>
    </div>
  );
};
