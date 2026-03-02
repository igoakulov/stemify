"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SceneHistoryDialog } from "@/components/SceneHistoryDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { VersionHistoryDialog } from "@/components/VersionHistoryDialog";
import { SceneViewport } from "@/components/SceneViewport";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { SceneEditorPanel } from "@/components/SceneEditorPanel";
import { clear_banner } from "@/lib/chat/banner";
import {
  load_camera_mode,
  save_camera_mode,
  type CameraMode,
} from "@/lib/scene/camera_mode";
import { load_grid_snap, save_grid_snap } from "@/lib/scene/global_settings";
import {
  load_saved_scenes,
  save_saved_scenes,
  get_active_scene_id,
  set_active_scene_id,
  clear_active_scene_id,
  type SavedScene,
  SceneVersion,
  update_current_version_code,
  get_scene_code,
  increment_user_edit_count,
  make_version_id,
} from "@/lib/scene/store";
import { seed_starter_scenes_if_empty } from "@/lib/scene/seed";
import {
  get_current_abort_controller,
  set_current_abort_controller,
} from "@/lib/chat/store";
import { useSceneSelection } from "@/lib/scene/use_scene_selection";
import { useSceneEditorStore } from "@/lib/scene/editor_store";
import { SCENE_ROOT_ID } from "@/lib/scene/constants";

export function AppShell() {
  const [active_scene, set_active_scene] = useState<SavedScene | null>(null);
  const [grid_snap, set_grid_snap] = useState<boolean | null>(null);
  const [camera_mode, set_camera_mode] = useState<CameraMode>("rotate");
  const [showSceneEditor, setShowSceneEditor] = useState(false);
  const [sceneCode, setSceneCode] = useState("");
  const active_scene_id_ref = useRef<string | null>(null);
  const manualToggleRef = useRef(false);
  const prevSceneRef = useRef<{ id: string | null; versionId: string | null }>({
    id: null,
    versionId: null,
  });

  // Load camera mode and grid snap from localStorage after mount (avoid hydration mismatch)
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      const saved_camera = load_camera_mode();
      const saved_grid = load_grid_snap();
      set_camera_mode(saved_camera);
      set_grid_snap(saved_grid);
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

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
      const isInputFocused =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true" ||
        // Check if Monaco editor is focused (Electron needs this check)
        target?.closest(".monaco-editor") !== null;

      // Check if any modal dialog is open
      const hasOpenModal = document.body.querySelector(
        '[data-state="open"][role="dialog"]',
      );

      // "/" - open editor (only when no input focused)
      if (e.key === "/" && !isInputFocused) {
        e.preventDefault();
        manualToggleRef.current = true;
        setShowSceneEditor(true);
        // Focus the editor after opening
        setTimeout(() => {
          window.dispatchEvent(new Event("stemify:focus-editor"));
        }, 0);
      }

      // "H" - toggle history modal
      if (e.key === "h" && !isInputFocused) {
        e.preventDefault();
        if (hasOpenModal) {
          window.dispatchEvent(new Event("stemify:close-history"));
        } else {
          window.dispatchEvent(new Event("stemify:open-history"));
        }
      }

      // "V" - toggle versions modal
      if (e.key === "v" && !isInputFocused && active_scene?.id) {
        e.preventDefault();
        if (hasOpenModal) {
          window.dispatchEvent(new Event("stemify:close-version-history"));
        } else {
          window.dispatchEvent(
            new CustomEvent("stemify:open-version-history", {
              detail: { sceneId: active_scene.id },
            }),
          );
        }
      }

      // Escape - close editor if open, otherwise deselect object
      if (e.key === "Escape" && !isInputFocused && !hasOpenModal) {
        if (editorRef.current) {
          manualToggleRef.current = true;
          setShowSceneEditor(false);
        } else {
          window.dispatchEvent(
            new CustomEvent("stemify:select-object", {
              detail: { objectId: null },
            }),
          );
        }
      }
    };

    // Keep ref in sync
    editorRef.current = showSceneEditor;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSceneEditor, active_scene?.id]);

  // Listen for explicit editor open requests (e.g., clicking on object)
  useEffect(() => {
    const handleOpenEditor = () => {
      if (!showSceneEditor) {
        manualToggleRef.current = true;
        setShowSceneEditor(true);
      }
    };

    window.addEventListener("stemify:open-editor", handleOpenEditor);
    return () =>
      window.removeEventListener("stemify:open-editor", handleOpenEditor);
  }, [showSceneEditor]);

  const handleDrillUp = useCallback(() => {
    if (!selectedObjectId) return;
    window.dispatchEvent(
      new CustomEvent("stemify:drill-up", {
        detail: { objectId: selectedObjectId },
      }),
    );
  }, [selectedObjectId]);

  const handleDrillDown = useCallback(() => {
    if (!selectedObjectId) return;
    window.dispatchEvent(
      new CustomEvent("stemify:drill-down", {
        detail: { objectId: selectedObjectId },
      }),
    );
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
    setSceneCode(still_exists ? get_scene_code(still_exists) : "");
  }, []);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      seed_starter_scenes_if_empty();
      const scenes = load_saved_scenes();
      if (scenes.length === 0) return;

      const previous_active_id = get_active_scene_id();
      const previous_active = scenes.find((s) => s.id === previous_active_id);

      if (previous_active) {
        active_scene_id_ref.current = previous_active.id;
        set_active_scene(previous_active);
        setSceneCode(get_scene_code(previous_active));
      }
    });

    const on_confirm_new = () => {
      const controller = get_current_abort_controller();
      controller?.abort();
      set_current_abort_controller(null);
      clear_active_scene_id();
      window.dispatchEvent(
        new CustomEvent("stemify:load-scene", { detail: { scene: null } }),
      );
      active_scene_id_ref.current = null;
      set_active_scene(null);
      setSceneCode("");
      clear_banner();
    };

    const on_scenes_changed = (event: Event) => {
      const custom = event as CustomEvent<{
        activeId?: string;
        source?: string;
      }>;
      refresh_from_storage(custom.detail?.activeId);
    };

    const on_load_scene = (event: Event) => {
      const custom = event as CustomEvent<{ scene: SavedScene | null }>;
      const scene = custom.detail.scene;
      if (scene === null) {
        active_scene_id_ref.current = null;
        set_active_scene(null);
        setSceneCode("");
        clear_active_scene_id();
        clear_banner();
      } else {
        active_scene_id_ref.current = scene.id;
        set_active_scene(scene);
        setSceneCode(get_scene_code(scene));
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

  const update_scene_code_storage = useCallback(
    (code: string) => {
      if (active_scene) {
        const updated_scene = update_current_version_code(active_scene, code);
        increment_user_edit_count(updated_scene);
        window.dispatchEvent(
          new CustomEvent("stemify:scenes-changed", {
            detail: { activeId: active_scene.id, source: "user-edit" },
          }),
        );
      } else if (code.trim()) {
        // Create new scene in null state when user types valid code
        const now = Date.now();
        const scene_id = `scene_${now}`;
        const version: SceneVersion = {
          id: make_version_id(),
          sceneId: scene_id,
          createdAt: now,
          description: "Initial version",
          sceneCode: code,
          userEditCount: 0,
        };
        const new_scene: SavedScene = {
          id: scene_id,
          title: "Untitled",
          createdAt: now,
          updatedAt: now,
          currentVersionId: version.id,
          versions: [version],
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
    },
    [active_scene],
  );

  const on_user_edit_applied = useCallback(() => {
    if (!active_scene) return;

    // Note: We don't call increment_user_edit_count here because:
    // 1. update_current_version_code already saves to storage
    // 2. Calling increment_user_edit_count would use stale active_scene
    //    and overwrite the new code with old data
    // Edit count will be incremented on next LLM response or manual action
  }, [active_scene]);

  // Clear selection when scene changes (including initial load and zero state)
  useEffect(() => {
    const prev = prevSceneRef.current;
    const curr = active_scene;
    const isInitialLoad = prev.id === null;

    if (isInitialLoad) {
      prevSceneRef.current = {
        id: curr?.id ?? null,
        versionId: curr?.currentVersionId ?? null,
      };
      return;
    }

    const sceneChanged = prev.id !== (curr?.id ?? null);

    if (sceneChanged) {
      // Full scene change - clear selection
      window.dispatchEvent(
        new CustomEvent("stemify:select-object", {
          detail: { objectId: null, startObjectId: null, breadcrumbs: [] },
        }),
      );
    }
    // Note: version change within same scene - NO selection clear (keeps user's selection)
    // (versionChanged logic is intentionally omitted here)

    prevSceneRef.current = {
      id: curr?.id ?? null,
      versionId: curr?.currentVersionId ?? null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active_scene?.id, active_scene?.currentVersionId]);

  return (
    <div className="h-dvh w-dvw overflow-hidden bg-(--main-black) text-zinc-50">
      <div className="grid h-full grid-cols-[minmax(0,7fr)_minmax(310px,3fr)] overflow-hidden">
        <section className="relative h-full overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="relative flex-1 min-h-0">
              <SceneViewport
                sceneCode={active_scene ? get_scene_code(active_scene) : ""}
                sceneId={active_scene?.id ?? ""}
                gridSnap={grid_snap ?? false}
                cameraMode={camera_mode}
                onCameraModeChangeAction={(mode) => {
                  save_camera_mode(mode);
                  set_camera_mode(mode);
                  window.dispatchEvent(
                    new CustomEvent("stemify:camera-mode-change", {
                      detail: { mode },
                    }),
                  );
                }}
                onResetCameraAction={() =>
                  window.dispatchEvent(new Event("stemify:camera-reset"))
                }
                onGoHomeAction={() => {
                  window.dispatchEvent(new Event("stemify:confirm-new-scene"));
                }}
                onGridChangeAction={(enabled) => {
                  set_grid_snap(enabled);
                  save_grid_snap(enabled);
                }}
                onDrillUpAction={handleDrillUp}
                onDrillDownAction={handleDrillDown}
              />
            </div>
          </div>
          <SceneHistoryDialog
            onLoadScene={(scene) => {
              window.dispatchEvent(
                new CustomEvent("stemify:load-scene", { detail: { scene } }),
              );
            }}
          />
          <SettingsDialog />
          <VersionHistoryDialog />
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
          <div
            className={`shrink-0 transition-all duration-100 ease-in-out ${showSceneEditor ? "h-[50%] min-h-37.5" : "h-8.5"}`}
          >
            <SceneEditorPanel
              fullSceneCode={sceneCode}
              sceneId={active_scene?.id}
              currentVersionId={active_scene?.currentVersionId}
              versionCount={active_scene?.versions?.length ?? 0}
              selectedObjectId={selectedObjectId}
              breadcrumbs={breadcrumbs}
              onBreadcrumbClick={(id, index) => {
                // index 0 = "scene" - dispatch SCENE_ROOT_ID to show full scene code
                const objectId = index === 0 ? SCENE_ROOT_ID : id;
                const newStartObjectId =
                  index === 0 ? SCENE_ROOT_ID : startObjectId;
                window.dispatchEvent(
                  new CustomEvent("stemify:select-object", {
                    detail: {
                      objectId,
                      startObjectId: newStartObjectId,
                      breadcrumbs,
                    },
                  }),
                );
              }}
              update_scene_code_editor={update_scene_code_editor}
              update_scene_code_storage={update_scene_code_storage}
              onUserEditApplied={on_user_edit_applied}
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
