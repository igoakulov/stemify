import { create } from "zustand";

type SceneEditorState = {
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  breadcrumbs: string[];
  startObjectId: string | null;
  sceneCode: string;
  validationError: string | null;
  setSelectedObject: (id: string | null, breadcrumbs?: string[], startObjectId?: string | null) => void;
  setHoveredObject: (id: string | null) => void;
  setSceneCode: (code: string) => void;
  setValidationError: (error: string | null) => void;
};

export const useSceneEditorStore = create<SceneEditorState>((set) => ({
  selectedObjectId: null,
  hoveredObjectId: null,
  breadcrumbs: [],
  startObjectId: null,
  sceneCode: "",
  validationError: null,

  setSelectedObject: (id, breadcrumbs = [], startObjectId) => set((state) => ({ 
    selectedObjectId: id, 
    breadcrumbs,
    startObjectId: startObjectId !== undefined ? startObjectId : (state.startObjectId || id)
  })),
  setHoveredObject: (id) => set({ hoveredObjectId: id }),
  setSceneCode: (code) => set({ sceneCode: code }),
  setValidationError: (error) => set({ validationError: error }),
}));

export function select_object(id: string | null, breadcrumbs: string[] = [], startObjectId: string | null = null): void {
  useSceneEditorStore.getState().setSelectedObject(id, breadcrumbs, startObjectId);
}

export function hover_object(id: string | null): void {
  useSceneEditorStore.getState().setHoveredObject(id);
}

export function get_start_object_id(): string | null {
  return useSceneEditorStore.getState().startObjectId;
}

export function update_scene_code(code: string): void {
  useSceneEditorStore.getState().setSceneCode(code);
}

export function set_validation_error(error: string | null): void {
  useSceneEditorStore.getState().setValidationError(error);
}
