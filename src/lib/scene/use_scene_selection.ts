import { useEffect } from "react";
import {
  useSceneEditorStore,
  select_object,
} from "@/lib/scene/editor_store";

export function useSceneSelection() {
  const setHighlight = useSceneEditorStore((s) => s.setHoveredObject);

  useEffect(() => {
    const onSelect = (event: Event) => {
      const custom = event as CustomEvent<{ objectId: string | null; breadcrumbs?: string[]; startObjectId?: string | null }>;
      const breadcrumbs = custom.detail.breadcrumbs ?? [];
      const startObjectId = custom.detail.startObjectId;
      select_object(custom.detail.objectId, breadcrumbs, startObjectId);
    };

    window.addEventListener("stemify:select-object", onSelect);

    return () => {
      window.removeEventListener("stemify:select-object", onSelect);
    };
  }, [setHighlight]);
}
