import { useEffect } from "react";
import {
  useSceneEditorStore,
  select_object,
  hover_object,
} from "@/lib/scene/editor_store";

export function useSceneSelection() {
  const setHighlight = useSceneEditorStore((s) => s.setHoveredObject);

  useEffect(() => {
    const onSelect = (event: Event) => {
      const custom = event as CustomEvent<{ objectId: string | null; breadcrumbs?: string[]; originalSelectedId?: string | null }>;
      const breadcrumbs = custom.detail.breadcrumbs ?? [];
      const originalSelectedId = custom.detail.originalSelectedId;
      // Only pass originalSelectedId if explicitly provided; otherwise preserve existing
      if (originalSelectedId !== undefined) {
        select_object(custom.detail.objectId, breadcrumbs, originalSelectedId);
      } else {
        select_object(custom.detail.objectId, breadcrumbs);
      }
    };

    const onHighlight = (event: Event) => {
      const custom = event as CustomEvent<{ objectId: string | null }>;
      setHighlight(custom.detail.objectId);
    };

    window.addEventListener("stemify:select-object", onSelect);
    window.addEventListener("stemify:highlight-object", onHighlight);

    return () => {
      window.removeEventListener("stemify:select-object", onSelect);
      window.removeEventListener("stemify:highlight-object", onHighlight);
    };
  }, [setHighlight]);
}
