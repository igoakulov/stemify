"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SceneHistoryDialog } from "@/components/SceneHistoryDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { SceneViewport } from "@/components/SceneViewport";
import { SceneToolbar } from "@/components/SceneToolbar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { SceneEditorPanel } from "@/components/SceneEditorPanel";
import { clear_banner } from "@/lib/chat/banner";
import {
  load_saved_scenes,
  save_saved_scenes,
  get_active_scene_id,
  set_active_scene_id,
  clear_active_scene_id,
  type SavedScene,
  update_scene_grid,
  upsert_scene,
} from "@/lib/scene/store";
import { get_current_abort_controller, set_current_abort_controller } from "@/lib/chat/store";
import { useSceneSelection } from "@/lib/scene/use_scene_selection";
import { useSceneEditorStore } from "@/lib/scene/editor_store";
import { SCENE_ROOT_ID } from "@/lib/scene/constants";

export function AppShell() {
  const [active_scene, set_active_scene] = useState<SavedScene | null>(null);
  const [grid_snap, set_grid_snap] = useState(true);
  const [showSceneEditor, setShowSceneEditor] = useState(false);
  const [sceneCode, setSceneCode] = useState("");
  const active_scene_id_ref = useRef<string | null>(null);
  const manualToggleRef = useRef(false);
  const prevSceneRef = useRef<SavedScene | null>(null);
  
  const selectedObjectId = useSceneEditorStore((s) => s.selectedObjectId);
  const breadcrumbs = useSceneEditorStore((s) => s.breadcrumbs);
  const startObjectId = useSceneEditorStore((s) => s.startObjectId);
  const validationError = useSceneEditorStore((s) => s.validationError);

  useSceneSelection();

  // Keyboard shortcuts
  useEffect(() => {
    const editorRef = { current: showSceneEditor };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if input/textarea is focused (use e.target to get element BEFORE blur)
      const target = e.target as HTMLElement;
      const activeTag = target?.tagName;
      const isInputFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || target?.getAttribute('contenteditable') === 'true';
      
      // Check if any modal dialog is open
      const hasOpenModal = document.body.querySelector('[data-state="open"][role="dialog"]');
      
      // "/" - toggle editor (only when no input focused)
      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        manualToggleRef.current = true;
        setShowSceneEditor(prev => !prev);
      }
      
      // Escape - close editor if open, otherwise deselect object
      if (e.key === 'Escape' && !isInputFocused && !hasOpenModal) {
        if (editorRef.current) {
          manualToggleRef.current = true;
          setShowSceneEditor(false);
        } else {
          window.dispatchEvent(new CustomEvent("stemify:select-object", { detail: { objectId: null } }));
        }
      }
    };
    
    // Keep ref in sync
    editorRef.current = showSceneEditor;
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSceneEditor]);

  // Listen for explicit editor open requests (e.g., clicking on object)
  useEffect(() => {
    const handleOpenEditor = () => {
      if (!showSceneEditor) {
        manualToggleRef.current = true;
        setShowSceneEditor(true);
      }
    };
    
    window.addEventListener("stemify:open-editor", handleOpenEditor);
    return () => window.removeEventListener("stemify:open-editor", handleOpenEditor);
  }, [showSceneEditor]);

  const handleDrillUp = useCallback(() => {
    if (!selectedObjectId) return;
    window.dispatchEvent(new CustomEvent("stemify:drill-up", { detail: { objectId: selectedObjectId } }));
  }, [selectedObjectId]);

  const handleDrillDown = useCallback(() => {
    if (!selectedObjectId) return;
    window.dispatchEvent(new CustomEvent("stemify:drill-down", { detail: { objectId: selectedObjectId } }));
  }, [selectedObjectId]);

  const refresh_from_storage = useCallback((active_id_override?: string) => {
    const scenes = load_saved_scenes();
    const local_active_id = get_active_scene_id();

    if (active_id_override && active_id_override !== local_active_id) {
      active_scene_id_ref.current = null;
      set_active_scene(null);
      return;
    }

    const active_id = local_active_id ?? active_scene_id_ref.current;
    if (!active_id) {
      set_active_scene(null);
      return;
    }

    const still_exists = scenes.find((s) => s.id === active_id) ?? null;
    active_scene_id_ref.current = still_exists?.id ?? null;
    set_active_scene(still_exists);
    set_grid_snap(still_exists?.grid?.enabled ?? true);
    setSceneCode(still_exists?.sceneCode ?? "");
  }, []);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      const scenes = load_saved_scenes();
      if (scenes.length === 0) return;

      const previous_active_id = get_active_scene_id();
      const previous_active = scenes.find((s) => s.id === previous_active_id);

      if (previous_active) {
        active_scene_id_ref.current = previous_active.id;
        set_active_scene(previous_active);
        set_grid_snap(previous_active.grid?.enabled ?? true);
        setSceneCode(previous_active.sceneCode ?? "");
      }
    });

    const on_confirm_new = () => {
      const controller = get_current_abort_controller();
      controller?.abort();
      set_current_abort_controller(null);
      clear_active_scene_id();
      window.dispatchEvent(new CustomEvent("stemify:load-scene", { detail: { scene: null } }));
      active_scene_id_ref.current = null;
      set_active_scene(null);
      setSceneCode("");
      clear_banner();
    };

    const on_scenes_changed = (event: Event) => {
      const custom = event as CustomEvent<{ activeId?: string }>;
      refresh_from_storage(custom.detail?.activeId);
    };

    const on_load_scene = (event: Event) => {
      const custom = event as CustomEvent<{ scene: SavedScene | null }>;
      const scene = custom.detail.scene;
      if (scene === null) {
        active_scene_id_ref.current = null;
        set_active_scene(null);
        set_grid_snap(true);
        setSceneCode("");
        clear_active_scene_id();
        clear_banner();
      } else {
        active_scene_id_ref.current = scene.id;
        set_active_scene(scene);
        set_grid_snap(scene.grid?.enabled ?? true);
        setSceneCode(scene.sceneCode ?? "");
        set_active_scene_id(scene.id);
        clear_banner();
      }
    };

    window.addEventListener("stemify:confirm-new-scene", on_confirm_new);
    window.addEventListener("stemify:scenes-changed", on_scenes_changed);
    window.addEventListener("stemify:load-scene", on_load_scene);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("stemify:confirm-new-scene", on_confirm_new);
      window.removeEventListener("stemify:scenes-changed", on_scenes_changed);
      window.removeEventListener("stemify:load-scene", on_load_scene);
    };
  }, [refresh_from_storage]);

  const update_scene_code_editor = useCallback((code: string) => {
    setSceneCode(code);
  }, []);

  const update_scene_code_storage = useCallback((code: string) => {
    if (active_scene) {
      upsert_scene({
        ...active_scene,
        sceneCode: code,
        updatedAt: Date.now(),
      });
      window.dispatchEvent(
        new CustomEvent("stemify:scenes-changed", {
          detail: { activeId: active_scene.id },
        }),
      );
    } else if (code.trim()) {
      // Create new scene in null state when user types valid code
      const now = Date.now();
      const new_scene: SavedScene = {
        id: `scene_${now}`,
        title: "Untitled",
        createdAt: now,
        updatedAt: now,
        sceneCode: code,
      };
      const scenes = load_saved_scenes();
      save_saved_scenes([new_scene, ...scenes]);
      set_active_scene_id(new_scene.id);
      window.dispatchEvent(
        new CustomEvent("stemify:scenes-changed", {
          detail: { activeId: new_scene.id },
        }),
      );
    }
  }, [active_scene]);

  // Clear selection when scene changes (including initial load and zero state)
  useEffect(() => {
    const prevId = prevSceneRef.current?.id;
    const currId = active_scene?.id;
    const isInitialLoad = prevSceneRef.current === null;
    if (isInitialLoad) {
      prevSceneRef.current = active_scene;
      return; // Let SceneViewport handle initialization
    }
    if (prevId !== currId) {
      window.dispatchEvent(new CustomEvent("stemify:select-object", { 
        detail: { objectId: null, startObjectId: null, breadcrumbs: [] } 
      }));
    }
    prevSceneRef.current = active_scene;
  }, [active_scene]);

  return (
    <div className="h-dvh w-full overflow-hidden bg-[var(--main-black)] text-zinc-50">
      <div className="grid h-full grid-cols-[minmax(0,7fr)_minmax(310px,3fr)] overflow-hidden">
          <section className="relative h-full overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="relative flex-1 min-h-0">
                  <SceneViewport 
                    key={active_scene?.id} 
                    sceneCode={active_scene?.sceneCode ?? ""} 
                    sceneId={active_scene?.id ?? ""}
                    gridSnap={grid_snap}
                  />
                  <SceneToolbar
                    onResetCamera={() => window.dispatchEvent(new Event("stemify:camera-reset"))}
                    onGoHome={() => {
                      window.dispatchEvent(new Event("stemify:confirm-new-scene"));
                    }}
                    gridSnap={grid_snap}
                    onGridChange={(enabled) => {
                      set_grid_snap(enabled);
                      if (active_scene?.id) {
                        update_scene_grid(active_scene.id, { enabled });
                      }
                    }}
                    onDrillUp={handleDrillUp}
                    onDrillDown={handleDrillDown}
                  />
                </div>
            </div>
            <SceneHistoryDialog
              onLoadScene={(scene) => {
                window.dispatchEvent(new CustomEvent("stemify:load-scene", { detail: { scene } }));
              }}
            />
            <SettingsDialog />
          </section>

          <aside className="flex h-full flex-col overflow-hidden">
            {/* Header - always visible */}
            <div className="shrink-0">
              <ChatPanel 
                active_scene={active_scene}
                showSceneEditorButton={false}
                headerOnly={true}
              />
            </div>
            
            {/* Editor - always visible, toolbar always shown, editor area collapses */}
            <div className={`shrink-0 transition-all duration-100 ease-in-out ${showSceneEditor ? "h-[40%] min-h-[150px]" : "h-[34px]"}`}>
              <SceneEditorPanel
                key={selectedObjectId ?? "scene-view"}
                fullSceneCode={sceneCode}
                selectedObjectId={selectedObjectId}
                breadcrumbs={breadcrumbs}
                onBreadcrumbClick={(id, index) => {
                  // index 0 = "scene" - dispatch SCENE_ROOT_ID to show full scene code
                  const objectId = index === 0 ? SCENE_ROOT_ID : id;
                  window.dispatchEvent(new CustomEvent("stemify:select-object", { detail: { objectId, startObjectId, breadcrumbs } }));
                }}
                update_scene_code_editor={update_scene_code_editor}
                update_scene_code_storage={update_scene_code_storage}
                isOpen={showSceneEditor}
                onToggle={() => {
                  manualToggleRef.current = true;
                  setShowSceneEditor(!showSceneEditor);
                }}
                onOpen={() => {
                  manualToggleRef.current = true;
                  setShowSceneEditor(true);
                }}
                validationError={validationError}
              />
            </div>
            
            {/* Chat content - fills remaining space */}
            <div className="overflow-hidden flex-1 min-h-0">
              <ChatPanel 
                active_scene={active_scene}
                showSceneEditorButton={false}
                hideHeader={true}
              />
            </div>
          </aside>
      </div>
    </div>
  );
}
