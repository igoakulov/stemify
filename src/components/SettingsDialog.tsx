"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  if (!is_mounted) return null;

  return (
    <Dialog open={open} onOpenChange={set_open}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            API key and model selection will be added in a later milestone.
          </DialogDescription>
        </DialogHeader>

        <div className="text-sm text-muted-foreground">
          Milestone 0: modal skeleton only.
        </div>
      </DialogContent>
    </Dialog>
  );
}
