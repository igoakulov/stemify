import { create } from "zustand";
import { type ValidationError, type ValidationErrorType } from "./validation";

export type { ValidationError, ValidationErrorType };

type SceneEditorState = {
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  breadcrumbs: string[];
  startObjectId: string | null;
  sceneCode: string;
  validationError: string | null;
  validationErrors: ValidationError[];
  currentErrorIndex: number;
  warnings: string[];
  dismissedWarnings: Set<string>;
  setSelectedObject: (id: string | null, breadcrumbs?: string[], startObjectId?: string | null) => void;
  setHoveredObject: (id: string | null) => void;
  setSceneCode: (code: string) => void;
  setValidationError: (error: string | null) => void;
  setValidationErrors: (errors: ValidationError[]) => void;
  setCurrentErrorIndex: (index: number) => void;
  setWarnings: (warnings: string[]) => void;
  dismissWarning: (warning: string) => void;
};

export const useSceneEditorStore = create<SceneEditorState>((set) => ({
  selectedObjectId: null,
  hoveredObjectId: null,
  breadcrumbs: [],
  startObjectId: null,
  sceneCode: "",
  validationError: null,
  validationErrors: [],
  currentErrorIndex: 0,
  warnings: [],
  dismissedWarnings: new Set<string>(),

  setSelectedObject: (id, breadcrumbs = [], startObjectId) => set((state) => ({ 
    selectedObjectId: id, 
    breadcrumbs,
    startObjectId: startObjectId !== undefined ? startObjectId : (state.startObjectId || id)
  })),
  setHoveredObject: (id) => set({ hoveredObjectId: id }),
  setSceneCode: (code) => set({ sceneCode: code }),
  setValidationError: (error) => set({ validationError: error }),
  setValidationErrors: (errors) => set({ validationErrors: errors, currentErrorIndex: 0 }),
  setCurrentErrorIndex: (index) => set({ currentErrorIndex: index }),
  setWarnings: (warnings) => set({ warnings }),
  dismissWarning: (warning) => set((state) => {
    const newDismissed = new Set(state.dismissedWarnings);
    newDismissed.add(warning);
    return { dismissedWarnings: newDismissed };
  }),
}));

export function select_object(id: string | null, breadcrumbs: string[] = [], startObjectId: string | null = null): void {
  useSceneEditorStore.getState().setSelectedObject(id, breadcrumbs, startObjectId);
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

export function set_validation_errors(errors: ValidationError[]): void {
  useSceneEditorStore.getState().setValidationErrors(errors);
}

export function set_current_error_index(index: number): void {
  useSceneEditorStore.getState().setCurrentErrorIndex(index);
}

export function next_error(): void {
  const state = useSceneEditorStore.getState();
  const { validationErrors, currentErrorIndex } = state;
  if (validationErrors.length === 0) return;
  const nextIndex = (currentErrorIndex + 1) % validationErrors.length;
  state.setCurrentErrorIndex(nextIndex);
}

export function prev_error(): void {
  const state = useSceneEditorStore.getState();
  const { validationErrors, currentErrorIndex } = state;
  if (validationErrors.length === 0) return;
  const prevIndex = currentErrorIndex === 0 ? validationErrors.length - 1 : currentErrorIndex - 1;
  state.setCurrentErrorIndex(prevIndex);
}

export function set_warnings(warnings: string[]): void {
  useSceneEditorStore.getState().setWarnings(warnings);
}

export function dismiss_warning(warning: string): void {
  useSceneEditorStore.getState().dismissWarning(warning);
}
