"use client";

import { useEffect } from "react";

import { show_suggestion, clear_banner } from "@/lib/chat/banner";
import { load_openrouter_api_key } from "@/lib/settings/storage";

function check_and_show_banner(): void {
  const api_key = load_openrouter_api_key();
  
  if (!api_key) {
    show_suggestion(
      <>
        To start chatting, add your{" "}
        <a
          href="https://openrouter.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          OpenRouter
        </a>{" "}
        API key. Your key is stored locally in your browser and never sent to our servers.
      </>,
      {
        title: "Welcome! Let's get you set up",
        actions: [
          {
            label: "Add API key",
            onClick: () => {
              window.dispatchEvent(new CustomEvent("stemify:open-settings"));
            },
          },
        ],
      }
    );
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
