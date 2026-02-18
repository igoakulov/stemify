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

export function AppShell() {
  const [active_scene, set_active_scene] = useState<SavedScene | null>(null);
  const [grid_snap, set_grid_snap] = useState(true);
  const [showSceneEditor, setShowSceneEditor] = useState(false);
  const [sceneCode, setSceneCode] = useState("");
  const active_scene_id_ref = useRef<string | null>(null);
  const manualToggleRef = useRef(false);
  
  const selectedObjectId = useSceneEditorStore((s) => s.selectedObjectId);
  const breadcrumbs = useSceneEditorStore((s) => s.breadcrumbs);
  const originalSelectedId = useSceneEditorStore((s) => s.originalSelectedId);
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

  // Auto-open/close editor based on selection (respects manual toggle)
  useEffect(() => {
    if (manualToggleRef.current) {
      manualToggleRef.current = false;
      return;
    }
    if (selectedObjectId && !showSceneEditor) {
      window.requestAnimationFrame(() => setShowSceneEditor(true))
    } else if (!selectedObjectId && showSceneEditor) {
      window.requestAnimationFrame(() => setShowSceneEditor(false))
    }
  }, [selectedObjectId, showSceneEditor])

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
      setShowSceneEditor(false);
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
        setShowSceneEditor(false);
      } else {
        active_scene_id_ref.current = scene.id;
        set_active_scene(scene);
        set_grid_snap(scene.grid?.enabled ?? true);
        setSceneCode(scene.sceneCode ?? "");
        set_active_scene_id(scene.id);
        clear_banner();
        setShowSceneEditor(false);
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

  const handleSceneCodeChange = useCallback((code: string) => {
    setSceneCode(code);
    if (active_scene) {
      upsert_scene({
        ...active_scene,
        sceneCode: code,
        updatedAt: Date.now(),
      });
    }
  }, [active_scene]);

  // Clear selection when scene changes or becomes null
  useEffect(() => {
    if (!active_scene) {
      window.dispatchEvent(new CustomEvent("stemify:select-object", { detail: { objectId: null } }));
    }
  }, [active_scene]);

  return (
    <div className="h-dvh w-full overflow-hidden bg-zinc-950 text-zinc-50">
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
                    selectedObjectId={selectedObjectId}
                    onDrillUp={handleDrillUp}
                    onDrillDown={handleDrillDown}
                    canDrillUp={!!selectedObjectId}
                    canDrillDown={!!selectedObjectId}
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
                showSceneEditorButton={true}
                onSceneEditorToggle={() => {
                  manualToggleRef.current = true;
                  setShowSceneEditor(!showSceneEditor);
                }}
                isSceneEditorOpen={showSceneEditor}
                validationError={validationError}
                headerOnly={true}
              />
            </div>
            
            {/* Editor - slides down from under header when open, slides up when closed */}
            <div className={`overflow-hidden mb-2 transition-all duration-100 ease-out ${showSceneEditor ? "h-[40%] min-h-[150px] shrink-0" : "h-0 min-h-0 shrink-0"}`}>
              <SceneEditorPanel
                key={selectedObjectId ?? "scene-view"}
                fullSceneCode={sceneCode}
                selectedObjectId={selectedObjectId}
                breadcrumbs={breadcrumbs}
                onBreadcrumbClick={(id) => {
                  // Click breadcrumb - navigate to that object, keep original chain
                  window.dispatchEvent(new CustomEvent("stemify:select-object", { detail: { objectId: id, originalSelectedId: originalSelectedId } }));
                }}
                onSceneCodeChange={handleSceneCodeChange}
              />
            </div>
            
            {/* Chat content - fills remaining space, pushed down by editor */}
            <div className={`overflow-hidden transition-all duration-100 ease-out flex-1 min-h-0`}>
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
