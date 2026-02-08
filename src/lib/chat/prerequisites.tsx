"use client";

import { useEffect } from "react";

import { show_suggestion, clear_banner, BANNERS } from "@/lib/chat/banner";
import { load_openrouter_api_key } from "@/lib/settings/storage";

function check_and_show_banner(): void {
  const api_key = load_openrouter_api_key();
  
  if (!api_key) {
    const config = BANNERS.WELCOME_SETUP;
    show_suggestion(config.message, {
      title: config.title,
      actions: config.actions,
    });
  } else {
    clear_banner();
  }
}

export function useChatPrerequisites(): void {
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      check_and_show_banner();
    });

    const on_api_key_saved = () => {
      check_and_show_banner();
    };

    window.addEventListener("stemify:api-key-saved", on_api_key_saved);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("stemify:api-key-saved", on_api_key_saved);
    };
  }, []);
}
