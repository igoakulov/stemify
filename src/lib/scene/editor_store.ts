import { create } from "zustand";

type SceneEditorState = {
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  breadcrumbs: string[];
  originalSelectedId: string | null;  // The leaf object originally selected (for drill up/down to restore)
  sceneCode: string;
  validationError: string | null;
  setSelectedObject: (id: string | null, breadcrumbs?: string[], originalSelectedId?: string | null) => void;
  setHoveredObject: (id: string | null) => void;
  setSceneCode: (code: string) => void;
  setValidationError: (error: string | null) => void;
};

export const useSceneEditorStore = create<SceneEditorState>((set) => ({
  selectedObjectId: null,
  hoveredObjectId: null,
  breadcrumbs: [],
  originalSelectedId: null,
  sceneCode: "",
  validationError: null,

  setSelectedObject: (id, breadcrumbs = [], originalSelectedId) => set((state) => ({ 
    selectedObjectId: id, 
    breadcrumbs,
    // If originalSelectedId is explicitly provided (including null), use it; otherwise keep existing or use id as new original
    originalSelectedId: originalSelectedId !== undefined ? originalSelectedId : (state.originalSelectedId || id)
  })),
  setHoveredObject: (id) => set({ hoveredObjectId: id }),
  setSceneCode: (code) => set({ sceneCode: code }),
  setValidationError: (error) => set({ validationError: error }),
}));

export function select_object(id: string | null, breadcrumbs: string[] = [], originalSelectedId: string | null = null): void {
  useSceneEditorStore.getState().setSelectedObject(id, breadcrumbs, originalSelectedId);
}

export function hover_object(id: string | null): void {
  useSceneEditorStore.getState().setHoveredObject(id);
}

export function get_original_selected_id(): string | null {
  return useSceneEditorStore.getState().originalSelectedId;
}

export function update_scene_code(code: string): void {
  useSceneEditorStore.getState().setSceneCode(code);
}

export function set_validation_error(error: string | null): void {
  useSceneEditorStore.getState().setValidationError(error);
}
