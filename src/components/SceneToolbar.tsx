"use client";

import { type FC } from "react";
import { History, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeyboardShortcut } from "@/components/ui/keyboard-shortcut";
import { cn } from "@/lib/utils";

type SceneToolbarProps = {
  onNewScene: () => void;
  onOpenHistory: () => void;
  onResetCamera: () => void;
  onOpenSettings: () => void;
  className?: string;
};

export const SceneToolbar: FC<SceneToolbarProps> = ({
  onNewScene,
  onOpenHistory,
  onResetCamera,
  onOpenSettings,
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
      <div className="flex items-center gap-1 rounded-xl p-2">
        {/* Stemify logo */}
        <span className="text-sm font-semibold text-white/80 tracking-tight px-1 select-none">
          Stemify
        </span>

        <div className="w-px h-4 bg-white/10 mx-1" />

        <Button
          type="button"
          variant="toolbar"
          size="icon"
          className="h-7 w-7"
          onClick={onNewScene}
          title="New scene"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="toolbar"
          size="icon"
          className="h-7 w-7"
          onClick={onOpenHistory}
          title="Scene history"
        >
          <History className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="toolbar"
          size="icon"
          className="h-7 w-7"
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* R shortcut inside toolbar */}
        <div className="flex items-center gap-1.5">
          <KeyboardShortcut
            keys={["R"]}
            onTrigger={onResetCamera}
            shortcutId="scene-reset"
            className="border border-white/5 bg-white/5"
          />
          <span className="text-[10px] text-white/50">- reset</span>
        </div>
      </div>
    </div>
  );
};
