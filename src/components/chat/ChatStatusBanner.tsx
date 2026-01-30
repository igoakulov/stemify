"use client";

import { X, AlertCircle, AlertTriangle, Lightbulb } from "lucide-react";
import { useEffect, useState, type FC } from "react";

import { Button } from "@/components/ui/button";
import {
  get_banner,
  subscribe_banner,
  clear_banner,
  type BannerState,
} from "@/lib/chat/banner";

const variant_styles = {
  error: {
    container:
      "border-red-500/20 bg-red-500/10",
    icon: "text-red-400",
    title: "text-red-200",
    message: "text-red-100",
    button:
      "border-red-500/30 bg-red-500/20 text-red-100 hover:bg-red-500/30 hover:text-white",
  },
  warning: {
    container:
      "border-yellow-500/20 bg-yellow-500/10",
    icon: "text-yellow-400",
    title: "text-yellow-200",
    message: "text-yellow-100",
    button:
      "border-yellow-500/30 bg-yellow-500/20 text-yellow-100 hover:bg-yellow-500/30 hover:text-white",
  },
  suggestion: {
    container:
      "border-blue-500/20 bg-blue-500/10",
    icon: "text-blue-400",
    title: "text-blue-200",
    message: "text-blue-100",
    button:
      "border-blue-500/30 bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 hover:text-white",
  },
};

const variant_icons = {
  error: AlertCircle,
  warning: AlertTriangle,
  suggestion: Lightbulb,
};

export const ChatStatusBanner: FC = () => {
  const [banner, set_banner_state] = useState<BannerState>(null);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      set_banner_state(get_banner());
    });

    const unsubscribe = subscribe_banner(() => {
      set_banner_state(get_banner());
    });

    return () => {
      window.cancelAnimationFrame(raf);
      unsubscribe();
    };
  }, []);

  if (!banner) return null;

  const styles = variant_styles[banner.type];
  const Icon = variant_icons[banner.type];

  return (
    <div
      className={`mx-auto w-full max-w-2xl rounded-lg border px-4 py-3 ${styles.container}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`} />

        <div className="flex-1 min-w-0">
          {banner.title && (
            <div className={`mb-1 text-sm font-semibold ${styles.title}`}>
              {banner.title}
            </div>
          )}
          <div className={`text-sm leading-relaxed ${styles.message}`}>
            {banner.message}
          </div>

          {banner.actions && banner.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {banner.actions.map((action, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={action.onClick}
                  className={`h-7 rounded-md border px-3 text-xs ${styles.button}`}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {banner.dismissable && (
          <button
            type="button"
            onClick={clear_banner}
            className="shrink-0 rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/60"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
