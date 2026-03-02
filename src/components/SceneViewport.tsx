"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";

import {
  create_three_base_template,
  type ThreeBaseTemplate,
} from "@/lib/three/base_template";
import {
  create_fly_controls,
  type FlyControls,
} from "@/lib/three/fly_controls";
import {
  create_scene_api,
  create_default_grid_state,
  type GridState,
  type SceneApiReturn,
} from "@/lib/scene/scene_api";
import { ObjectRegistry, type HoverData } from "@/lib/scene/object_registry";
import { execute_scene_code } from "@/lib/scene/execute_scene_code";
import { validate_scene, validate_scene_code } from "@/lib/scene/validation";
import { parse_model_output } from "@/lib/chat/parse";
import { get_thread } from "@/lib/chat/store";
import {
  show_error,
  show_warning,
  BANNERS,
  prepare_error_context,
} from "@/lib/chat/banner";
import { KeyboardShortcut } from "@/components/ui/keyboard-shortcut";
import {
  Eye,
  Rocket,
  Hand,
  Grid2X2Check,
  Turtle,
  PersonStanding,
  Bike,
  Plane,
  Car,
  Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  resize_renderer_to_canvas,
  DEFAULT_AXES_ID,
  create_default_axes,
} from "@/lib/three/base_template";
import {
  get_start_object_id,
  useSceneEditorStore,
  set_validation_error,
  set_validation_errors,
  set_warnings,
} from "@/lib/scene/editor_store";
import { SCENE_ROOT_ID } from "@/lib/scene/constants";
import { type CameraMode } from "@/lib/scene/camera_mode";
import {
  load_fly_speed_index,
  save_fly_speed_index,
} from "@/lib/scene/global_settings";

export type SceneViewportProps = {
  sceneCode: string;
  sceneId: string;
  gridSnap?: boolean;
  onGridChangeAction?: (enabled: boolean) => void;
  cameraMode?: CameraMode;
  onCameraModeChangeAction?: (mode: CameraMode) => void;
  onResetCameraAction?: () => void;
  onGoHomeAction?: () => void;
  onDrillUpAction?: () => void;
  onDrillDownAction?: () => void;
};

const HOVER_COLOR = 0xfbbf24;
const HOVER_OPACITY = 0.2;
const SELECTED_OPACITY = 0.6;

const FLY_SPEED_OPTIONS = [1, 5, 10, 25, 50, 100];

export function SceneViewport(props: SceneViewportProps) {
  const canvas_ref = useRef<HTMLCanvasElement | null>(null);
  const label_container_ref = useRef<HTMLDivElement | null>(null);
  const runtime_ref = useRef<ThreeBaseTemplate | null>(null);
  const raf_ref = useRef<number | null>(null);
  const grid_state_ref = useRef<GridState | null>(null);
  const prev_grid_snap_ref = useRef<boolean | undefined>(undefined);
  const prev_scene_id_ref = useRef<string | undefined>(undefined);
  const registry_ref = useRef<ObjectRegistry | null>(null);
  const highlighted_mesh_ref = useRef<THREE.Object3D | null>(null);
  const selected_mesh_ref = useRef<THREE.Object3D | null>(null);
  const selected_id_ref = useRef<string | null>(null);
  const tooltip_object_id_ref = useRef<string | null>(null);
  const saved_camera_position_ref = useRef<THREE.Vector3 | null>(null);
  const saved_camera_target_ref = useRef<THREE.Vector3 | null>(null);
  const raycaster_ref = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouse_ref = useRef<THREE.Vector2>(new THREE.Vector2());
  const mouse_down_pos_ref = useRef<{ x: number; y: number } | null>(null);
  const mouse_down_time_ref = useRef<number>(0);
  const fly_controls_ref = useRef<FlyControls | null>(null);
  const scene_api_result_ref = useRef<SceneApiReturn | null>(null);
  const [tooltip, setTooltip] = useState<HoverData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFlyMode, setIsFlyMode] = useState(false);
  const [flySpeedIndex, setFlySpeedIndex] = useState<number | null>(null);
  const getSpeedIcon = (speed: number) => {
    switch (speed) {
      case 1:
        return <Turtle className="w-3 h-3" />;
      case 5:
        return <PersonStanding className="w-3 h-3" />;
      case 10:
        return <Bike className="w-3 h-3" />;
      case 25:
        return <Car className="w-3 h-3" />;
      case 50:
        return <Plane className="w-3 h-3" />;
      case 100:
        return <Rocket className="w-3 h-3" />;
      default:
        return <Rocket className="w-3 h-3" />;
    }
  };
  const [flyKeys, setFlyKeys] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    rollLeft: false,
    rollRight: false,
  });

  // Refs to store latest highlight functions for use in event listeners
  const applyHoverHighlightRef = useRef<(objectId: string | null) => void>(
    () => {},
  );
  const applySelectionHighlightRef = useRef<(objectId: string | null) => void>(
    () => {},
  );
  const clearSelectionHighlightRef = useRef<() => void>(() => {});

  // Load fly speed index from global storage after mount (avoid hydration mismatch)
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      const saved = load_fly_speed_index();
      setFlySpeedIndex(saved);
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  // Sync with external selection events (like keyboard shortcuts, breadcrumbs clicks)
  // Also recalculates breadcrumbs if missing (e.g., when clicking breadcrumb in AppShell)
  useEffect(() => {
    const handleExternalSelect = (event: Event) => {
      const custom = event as CustomEvent<{
        objectId: string | null;
        breadcrumbs?: string[];
        startObjectId?: string | null;
      }>;
      const objectId = custom.detail.objectId;
      const breadcrumbs = custom.detail.breadcrumbs;

      // Apply selection highlight
      if (objectId) {
        applySelectionHighlightRef.current(objectId);
      } else {
        clearSelectionHighlightRef.current();
      }

      setSelectedId(objectId);
      selected_id_ref.current = objectId;

      // Auto-open editor for object selection, but not for scene level
      if (objectId !== null && objectId !== SCENE_ROOT_ID) {
        window.dispatchEvent(new CustomEvent("stemify:open-editor"));
      }

      // If breadcrumbs are missing but we have registry, recalculate them
      if (registry_ref.current && (!breadcrumbs || breadcrumbs.length === 0)) {
        const incomingStartObjectId = custom.detail.startObjectId;
        const incomingObjectId = custom.detail.objectId;

        // Normalize null to SCENE_ROOT_ID
        const effectiveObjectId =
          incomingObjectId === null ? SCENE_ROOT_ID : incomingObjectId;
        const effectiveStartObjectId =
          incomingStartObjectId === null
            ? SCENE_ROOT_ID
            : incomingStartObjectId;

        const newBreadcrumbs =
          registry_ref.current.find_path_to_root(effectiveObjectId);
        // Re-dispatch with breadcrumbs included, preserving startObjectId
        window.dispatchEvent(
          new CustomEvent("stemify:select-object", {
            detail: {
              objectId: effectiveObjectId,
              breadcrumbs: newBreadcrumbs,
              startObjectId: effectiveStartObjectId,
            },
          }),
        );
      }
    };

    window.addEventListener("stemify:select-object", handleExternalSelect);
    return () =>
      window.removeEventListener("stemify:select-object", handleExternalSelect);
  }, []);

  // Handle camera mode changes from toolbar
  useEffect(() => {
    const handleCameraModeChange = (event: Event) => {
      const custom = event as CustomEvent<{ mode: CameraMode }>;
      const newMode = custom.detail.mode;
      const isFly = newMode === "fly";
      setIsFlyMode(isFly);

      if (fly_controls_ref.current) {
        fly_controls_ref.current.setEnabled(isFly);
      }

      if (runtime_ref.current) {
        runtime_ref.current.controls.enabled = !isFly;

        // When switching from fly to rotate, reset orbit controls target to origin
        if (!isFly) {
          runtime_ref.current.controls.target.set(0, 0, 0);
          runtime_ref.current.controls.update();
        }
      }
    };

    window.addEventListener(
      "stemify:camera-mode-change",
      handleCameraModeChange,
    );
    return () =>
      window.removeEventListener(
        "stemify:camera-mode-change",
        handleCameraModeChange,
      );
  }, []);

  // Sync with cameraMode prop (handles initial load from localStorage)
  useEffect(() => {
    const isFly = props.cameraMode === "fly";
    setIsFlyMode(isFly);

    if (fly_controls_ref.current) {
      fly_controls_ref.current.setEnabled(isFly);
    }

    if (runtime_ref.current) {
      runtime_ref.current.controls.enabled = !isFly;
    }
  }, [props.cameraMode]);

  // Listen for fly mode key state updates
  useEffect(() => {
    const handleFlyKeyState = (event: Event) => {
      const custom = event as CustomEvent<typeof flyKeys>;
      setFlyKeys(custom.detail);
    };

    window.addEventListener(
      "stemify:fly-controls-key-state",
      handleFlyKeyState,
    );
    return () =>
      window.removeEventListener(
        "stemify:fly-controls-key-state",
        handleFlyKeyState,
      );
  }, []);

  // Update fly controls speed when changed
  useEffect(() => {
    if (fly_controls_ref.current && flySpeedIndex !== null) {
      fly_controls_ref.current.setSpeed(FLY_SPEED_OPTIONS[flySpeedIndex]);
    }
  }, [flySpeedIndex]);

  const getPickedId = useCallback((event: MouseEvent): string | null => {
    const canvas = canvas_ref.current;
    if (!canvas || !runtime_ref.current) return null;

    const rect = canvas.getBoundingClientRect();
    mouse_ref.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse_ref.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster_ref.current.setFromCamera(
      mouse_ref.current,
      runtime_ref.current.camera,
    );
    const intersects = raycaster_ref.current.intersectObjects(
      runtime_ref.current.root.children,
      true,
    );

    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        const userData = obj.userData;
        if (userData?.id && userData.selectable !== false) {
          return userData.id;
        }
        obj = obj.parent;
      }
    }

    return null;
  }, []);

  // Helper to apply highlight to a mesh or all children of a group
  const applyEmissiveToMesh = (
    mesh: THREE.Object3D,
    color: number,
    opacity: number,
  ) => {
    const applyToMaterial = (mat: THREE.Material) => {
      if (!(mat instanceof THREE.MeshStandardMaterial)) return;
      if (!mat.emissive) {
        mat.emissive = new THREE.Color(0x000000);
      }
      mat.emissive.setHex(color);
      mat.emissiveIntensity = opacity;
    };

    if (mesh instanceof THREE.Mesh && mesh.material) {
      applyToMaterial(mesh.material);
    } else if (mesh instanceof THREE.Group) {
      // For groups (like cylinders), apply to all children
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          applyToMaterial(child.material);
        }
      });
    }
  };

  // Helper to clear highlight from a mesh or all children of a group
  const clearEmissiveFromMesh = (mesh: THREE.Object3D) => {
    const clearFromMaterial = (mat: THREE.Material) => {
      if (!(mat instanceof THREE.MeshStandardMaterial)) return;
      if (!mat.emissive) {
        mat.emissive = new THREE.Color(0x000000);
      }
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    };

    if (mesh instanceof THREE.Mesh && mesh.material) {
      clearFromMaterial(mesh.material);
    } else if (mesh instanceof THREE.Group) {
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          clearFromMaterial(child.material);
        }
      });
    }
  };

  const clearHighlight = useCallback(() => {
    // Clear 3D mesh highlight
    if (highlighted_mesh_ref.current) {
      clearEmissiveFromMesh(highlighted_mesh_ref.current);
      highlighted_mesh_ref.current = null;
    }
    // Clear label hover highlight
    document.querySelectorAll(".css2d-label.label-hover").forEach((el) => {
      el.classList.remove("label-hover");
    });
  }, []);

  // Helper to check if a mesh is a child/descendant of another mesh
  const isDescendantOf = (
    child: THREE.Object3D,
    parent: THREE.Object3D,
  ): boolean => {
    if (child === parent) return true;
    let current: THREE.Object3D | null = child.parent;
    while (current) {
      if (current === parent) return true;
      current = current.parent;
    }
    return false;
  };

  const applyHoverHighlight = useCallback(
    (objectId: string | null) => {
      // Get the mesh for the current hover target
      if (!objectId || !registry_ref.current) {
        // No target - clear previous highlight
        clearHighlight();
        return;
      }

      // Check if this is a label first
      const labelEl = document.querySelector(
        `.css2d-label[data-object-id="${objectId}"]`,
      );
      if (labelEl) {
        // Clear previous 3D mesh highlight
        if (highlighted_mesh_ref.current) {
          clearEmissiveFromMesh(highlighted_mesh_ref.current);
          highlighted_mesh_ref.current = null;
        }
        // Clear previous label hover
        document.querySelectorAll(".css2d-label.label-hover").forEach((el) => {
          el.classList.remove("label-hover");
        });
        // Don't add hover class if already selected
        if (labelEl.classList.contains("label-selected")) return;
        labelEl.classList.add("label-hover");
        return;
      }

      // Get mesh from registry
      const mesh = registry_ref.current.get_mesh(objectId);
      if (!mesh) return;

      // Don't apply hover if this mesh (or its parent) is currently selected (keep selection highlight at 0.6)
      // Also check if a tooltip for this object is selected
      if (
        selected_mesh_ref.current &&
        isDescendantOf(mesh, selected_mesh_ref.current)
      )
        return;

      // Skip if already hovering over this same mesh/group - avoid clearing and reapplying
      if (mesh === highlighted_mesh_ref.current) return;

      // Clear previous highlight (3D mesh or label)
      if (highlighted_mesh_ref.current) {
        clearEmissiveFromMesh(highlighted_mesh_ref.current);
      }
      document.querySelectorAll(".css2d-label.label-hover").forEach((el) => {
        el.classList.remove("label-hover");
      });

      // Apply new highlight
      applyEmissiveToMesh(mesh, HOVER_COLOR, HOVER_OPACITY);
      highlighted_mesh_ref.current = mesh;
    },
    [clearHighlight],
  );

  // Update ref when applyHoverHighlight changes
  useEffect(() => {
    applyHoverHighlightRef.current = applyHoverHighlight;
  }, [applyHoverHighlight]);

  const applySelectionHighlight = useCallback((objectId: string | null) => {
    // Clear previous selection first
    document.querySelectorAll(".css2d-label.label-selected").forEach((el) => {
      el.classList.remove("label-selected");
    });

    // Clear previous selected mesh highlight
    if (selected_mesh_ref.current) {
      clearEmissiveFromMesh(selected_mesh_ref.current);
      selected_mesh_ref.current = null;
    }

    if (!objectId || !registry_ref.current) return;

    // Handle tooltip: prefix - tooltips highlight their underlying object
    let actualObjectId = objectId;
    if (objectId.startsWith("tooltip:")) {
      actualObjectId = objectId.slice(8);
    }

    // Check if this is a label first (CSS2DObject) - can't use emissive on labels
    const labelEl = document.querySelector(
      `.css2d-label[data-object-id="${actualObjectId}"]`,
    );
    if (labelEl) {
      labelEl.classList.add("label-selected");
      return;
    }

    // Try 3D mesh
    const mesh = registry_ref.current.get_mesh(actualObjectId);
    if (mesh) {
      applyEmissiveToMesh(mesh, HOVER_COLOR, SELECTED_OPACITY);
      selected_mesh_ref.current = mesh;
    }
  }, []);

  // Update ref when applySelectionHighlight changes
  useEffect(() => {
    applySelectionHighlightRef.current = applySelectionHighlight;
  }, [applySelectionHighlight]);

  const clearSelectionHighlight = useCallback(() => {
    // Clear selected mesh highlight (handles both meshes and groups)
    if (selected_mesh_ref.current) {
      clearEmissiveFromMesh(selected_mesh_ref.current);
      selected_mesh_ref.current = null;
    }
    // Clear label selection
    document.querySelectorAll(".css2d-label.label-selected").forEach((el) => {
      el.classList.remove("label-selected");
    });
  }, []);

  // Update ref when clearSelectionHighlight changes
  useEffect(() => {
    clearSelectionHighlightRef.current = clearSelectionHighlight;
  }, [clearSelectionHighlight]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    mouse_down_pos_ref.current = { x: event.clientX, y: event.clientY };
    mouse_down_time_ref.current = Date.now();
  }, []);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      // Check if this was a drag (not a click)
      if (mouse_down_pos_ref.current) {
        const dx = event.clientX - mouse_down_pos_ref.current.x;
        const dy = event.clientY - mouse_down_pos_ref.current.y;
        const dt = Date.now() - mouse_down_time_ref.current;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If moved more than 5px or held longer than 300ms, treat as drag
        if (distance > 5 || dt > 300) {
          return;
        }
      }

      const objectId = getPickedId(event);
      // Clicking on empty space selects scene
      const effectiveObjectId = objectId ?? SCENE_ROOT_ID;
      setSelectedId(effectiveObjectId);
      selected_id_ref.current = effectiveObjectId;
      const breadcrumbs = registry_ref.current
        ? registry_ref.current.find_path_to_root(effectiveObjectId)
        : [];
      // Clicking sets both selected and start to the clicked object
      window.dispatchEvent(
        new CustomEvent("stemify:select-object", {
          detail: {
            objectId: effectiveObjectId,
            breadcrumbs,
            startObjectId: effectiveObjectId,
          },
        }),
      );
    },
    [getPickedId],
  );

  const handleLabelClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const labelElement = target.closest(".css2d-label") as HTMLElement;
    if (labelElement) {
      const objectId = labelElement.dataset.objectId;
      if (objectId) {
        event.stopPropagation();
        setSelectedId(objectId);
        selected_id_ref.current = objectId;
        const breadcrumbs = registry_ref.current
          ? registry_ref.current.find_path_to_root(objectId)
          : [];
        // Clicking label sets both selected and start to the clicked object
        window.dispatchEvent(
          new CustomEvent("stemify:select-object", {
            detail: { objectId, breadcrumbs, startObjectId: objectId },
          }),
        );
        // Also open editor when clicking a label (even if already selected)
        window.dispatchEvent(new CustomEvent("stemify:open-editor"));
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedId || !registry_ref.current) {
      const timer = setTimeout(() => setTooltip(null), 0);
      return () => clearTimeout(timer);
    }

    // Handle tooltip: prefix - look up underlying object ID
    const lookupId = selectedId.startsWith("tooltip:")
      ? selectedId.slice(8)
      : selectedId;
    const hoverData = registry_ref.current.get_hover_data(lookupId);
    // Only show tooltip if explicitly defined (don't fallback to object id)
    const timer = setTimeout(() => {
      setTooltip(hoverData ?? null);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedId]);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const canvas = canvas_ref.current;
      const objectId = getPickedId(event);

      if (canvas) {
        canvas.style.cursor = objectId ? "pointer" : "default";
      }

      applyHoverHighlightRef.current(objectId);

      // Show tooltip on hover (if has hover data)
      if (objectId && registry_ref.current) {
        const hoverData = registry_ref.current.get_hover_data(objectId);
        if (hoverData) {
          // Show tooltip and track which object it's for
          setTooltip(hoverData);
          tooltip_object_id_ref.current = objectId;
        } else {
          // Hovering over object without tooltip - clear if not selected
          const hoveredObjId = tooltip_object_id_ref.current;
          if (
            hoveredObjId &&
            hoveredObjId !== selected_id_ref.current &&
            !selected_id_ref.current?.startsWith("tooltip:")
          ) {
            setTooltip(null);
            tooltip_object_id_ref.current = null;
          }
        }
      } else if (!objectId && tooltip_object_id_ref.current) {
        // Moved to empty space - clear tooltip unless there's a selection
        if (
          !selected_id_ref.current?.startsWith("tooltip:") &&
          tooltip_object_id_ref.current !== selected_id_ref.current
        ) {
          setTooltip(null);
          tooltip_object_id_ref.current = null;
        }
      }
    },
    [getPickedId],
  );

  const handleMouseLeave = useCallback(() => {
    const canvas = canvas_ref.current;
    if (canvas) {
      canvas.style.cursor = "default";
    }
    clearHighlight();
    // Clear tooltip on mouse leave (unless there's a selection)
    if (!selected_id_ref.current) {
      setTooltip(null);
    }
  }, [clearHighlight]);

  const handleDrillUp = useCallback(
    (event: CustomEvent<{ objectId: string }>) => {
      const { objectId } = event.detail;
      // Normalize SCENE_ROOT_ID to "scene" for breadcrumbs lookup
      const effectiveObjectId = objectId === SCENE_ROOT_ID ? "scene" : objectId;
      const breadcrumbs = useSceneEditorStore.getState().breadcrumbs;
      const currentIndex = breadcrumbs.indexOf(effectiveObjectId);

      // Only drill up if there's a parent (index > 0)
      if (currentIndex > 0) {
        const targetId = breadcrumbs[currentIndex - 1];
        const effectiveTargetId =
          targetId === "scene" ? SCENE_ROOT_ID : targetId;
        window.dispatchEvent(
          new CustomEvent("stemify:select-object", {
            detail: {
              objectId: effectiveTargetId,
              breadcrumbs,
              startObjectId: useSceneEditorStore.getState().startObjectId,
            },
          }),
        );
        window.dispatchEvent(new CustomEvent("stemify:open-editor"));
      }
    },
    [],
  );

  const handleDrillDown = useCallback(
    (event: CustomEvent<{ objectId: string }>) => {
      const { objectId } = event.detail;
      // Normalize SCENE_ROOT_ID to "scene" for breadcrumbs lookup
      const effectiveObjectId = objectId === SCENE_ROOT_ID ? "scene" : objectId;
      const breadcrumbs = useSceneEditorStore.getState().breadcrumbs;
      const startObjectId = useSceneEditorStore.getState().startObjectId;
      const currentIndex = breadcrumbs.indexOf(effectiveObjectId);

      // Only drill down if there's a child (not at end of path)
      if (currentIndex >= 0 && currentIndex < breadcrumbs.length - 1) {
        const targetId = breadcrumbs[currentIndex + 1];
        const effectiveTargetId =
          targetId === "scene" ? SCENE_ROOT_ID : targetId;
        window.dispatchEvent(
          new CustomEvent("stemify:select-object", {
            detail: { objectId: effectiveTargetId, breadcrumbs, startObjectId },
          }),
        );
        window.dispatchEvent(new CustomEvent("stemify:open-editor"));
      }
    },
    [],
  );

  // Main scene setup and execution effect
  useEffect(() => {
    const canvas = canvas_ref.current;
    const label_container = label_container_ref.current;

    if (!canvas || !label_container) return;

    // Clear saved camera when scene changes (new scene or different version)
    const prevSceneId = prev_scene_id_ref.current;
    if (prevSceneId !== undefined && prevSceneId !== props.sceneId) {
      saved_camera_position_ref.current = null;
      saved_camera_target_ref.current = null;
    }
    prev_scene_id_ref.current = props.sceneId;

    const runtime = create_three_base_template(canvas, label_container);
    runtime_ref.current = runtime;

    // Create fly controls
    const fly_controls = create_fly_controls({
      camera: runtime.camera,
      domElement: canvas,
      moveSpeed: 5,
    });
    fly_controls_ref.current = fly_controls;

    // Initialize controls based on camera mode
    const initialMode = props.cameraMode ?? "rotate";
    if (initialMode === "fly") {
      fly_controls.setEnabled(true);
      runtime.controls.enabled = false;
    }

    const on_reset = () => {
      runtime.reset_camera();
    };

    window.addEventListener("stemify:camera-reset", on_reset);

    // Large ground grid: 20x20 units with 0.5 unit spacing
    const grid = new THREE.GridHelper(20, 40);
    grid.material = runtime.materials.grid_line;
    runtime.scene.add(grid);

    // Initialize grid state
    const grid_state = create_default_grid_state();
    grid_state.enabled = props.gridSnap ?? false;
    grid_state_ref.current = grid_state;

    // Create registry and scene_api once (reused across all executions)
    const registry = new ObjectRegistry();
    registry_ref.current = registry;
    const scene_api_result = create_scene_api({
      template: runtime,
      registry,
      gridConfig: grid_state,
    });
    scene_api_result_ref.current = scene_api_result;

    // Start render loop unconditionally - grid/template should always be visible
    let lastTime = performance.now();
    const loop = (time: number) => {
      let delta = time - lastTime;
      lastTime = time;

      // Clamp delta to avoid huge jumps (e.g., after tab was inactive)
      delta = Math.min(delta, 100);

      resize_renderer_to_canvas(runtime);

      // Only update orbit controls when NOT in fly mode
      if (!fly_controls.enabled) {
        runtime.controls.update();
      }

      // Update fly controls when in fly mode
      if (fly_controls.enabled) {
        fly_controls.update(delta);
      }

      // Skip render if camera position is invalid
      if (!Number.isFinite(runtime.camera.position.x)) {
        runtime.camera.position.set(6, 4, 8);
      }

      runtime.renderer.render(runtime.scene, runtime.camera);
      runtime.label_renderer.render(runtime.scene, runtime.camera);

      // Continuously save camera position (survives HMR/component remounts)
      saved_camera_position_ref.current = runtime.camera.position.clone();
      saved_camera_target_ref.current = fly_controls.enabled
        ? fly_controls.getTarget()
        : runtime.controls.target.clone();

      raf_ref.current = window.requestAnimationFrame(loop);
    };
    raf_ref.current = window.requestAnimationFrame(loop);

    // Extract camera config from scene code
    function extract_camera_from_code(code: string): {
      position?: [number, number, number];
      lookat?: [number, number, number];
    } | null {
      const match = code.match(/scene\.camera\(\s*\{([^}]+)\}\s*\)/);
      if (!match) return null;

      const configStr = match[1];
      const result: {
        position?: [number, number, number];
        lookat?: [number, number, number];
      } = {};

      const posMatch = configStr.match(/position:\s*\[([^\]]+)\]/);
      if (posMatch) {
        const coords = posMatch[1].split(",").map((s) => parseFloat(s.trim()));
        if (coords.length === 3 && coords.every((c) => !isNaN(c))) {
          result.position = coords as [number, number, number];
        }
      }

      const lookatMatch = configStr.match(/lookat:\s*\[([^\]]+)\]/);
      if (lookatMatch) {
        const coords = lookatMatch[1]
          .split(",")
          .map((s) => parseFloat(s.trim()));
        if (coords.length === 3 && coords.every((c) => !isNaN(c))) {
          result.lookat = coords as [number, number, number];
        }
      }

      return Object.keys(result).length > 0 ? result : null;
    }

    // Validate scene code before clearing anything
    // This prevents clearing the scene when validation fails
    const validate_scene_code_internal = (
      code: string,
    ): ReturnType<typeof validate_scene_code> => {
      return validate_scene_code(code);
    };

    // Execute scene code function - assumes validation already passed
    // Creates fresh registry and scene_api, clears scene, then executes
    const execute_validated_scene = (
      code: string,
      validation: ReturnType<typeof validate_scene>,
    ) => {
      // Clear errors in editor store
      set_validation_error(null);
      set_validation_errors([]);

      if (validation.warnings && validation.warnings.length > 0) {
        set_warnings(validation.warnings);
        const config = BANNERS.PERFORMANCE_WARNING(
          validation.warnings.join(", "),
        );
        show_warning(config.message, { title: config.title });
      } else {
        set_warnings([]);
      }

      // Clear previous scene content before executing new code
      while (runtime.root.children.length > 0) {
        runtime.root.remove(runtime.root.children[0]);
      }

      // Restore default axes if removed by previous addAxes call
      if (!runtime.scene.getObjectByName(DEFAULT_AXES_ID)) {
        runtime.scene.add(create_default_axes());
      }

      // Reuse existing registry and scene_api - just reset them
      const scene_api_result = scene_api_result_ref.current;
      scene_api_result?.reset();
      registry_ref.current?.clear();

      const exec_error = execute_scene_code(code, scene_api_result!.api);
      if (exec_error) {
        set_validation_error(exec_error.message);
        set_validation_errors([
          { type: "runtime", message: exec_error.message },
        ]);
        return;
      }

      // Restore camera position after scene execution ONLY if scene code didn't set camera
      // This preserves user's view when editing objects, but respects scene.camera() when loading
      // If no saved camera (new scene), reset to default
      const camera_was_set = scene_api_result?.get_camera_was_set() ?? false;
      if (!camera_was_set) {
        if (
          saved_camera_position_ref.current &&
          saved_camera_target_ref.current
        ) {
          runtime.camera.position.copy(saved_camera_position_ref.current);
          runtime.controls.target.copy(saved_camera_target_ref.current);
          runtime.controls.update();
        } else {
          runtime.camera.position.set(6, 4, 8);
          runtime.controls.target.set(0, 0, 0);
          runtime.controls.update();
        }
      }

      // After execution, recalculate breadcrumbs from startObjectId
      let startId = get_start_object_id();

      // If no startId but there's scene code, default to scene root
      if (!startId && code && code.trim().length > 0) {
        startId = SCENE_ROOT_ID;
      }

      if (startId && registry_ref.current?.get_mesh(startId)) {
        const newBreadcrumbs = registry_ref.current.find_path_to_root(startId);
        window.dispatchEvent(
          new CustomEvent("stemify:select-object", {
            detail: {
              objectId: selected_id_ref.current,
              startObjectId: startId,
              breadcrumbs: newBreadcrumbs,
            },
          }),
        );
      } else if (startId && !registry_ref.current?.get_mesh(startId)) {
        // startObjectId deleted - clear everything
        window.dispatchEvent(
          new CustomEvent("stemify:select-object", {
            detail: { objectId: null, startObjectId: null, breadcrumbs: [] },
          }),
        );
      }
    };

    // Handle validation failure - show errors but don't clear scene
    const handle_validation_failure = (
      code: string,
      validation: ReturnType<typeof validate_scene>,
    ) => {
      const error_msg =
        validation.errors.length > 0
          ? validation.errors.map((e) => e.message).join("; ")
          : "Invalid scene code";

      // Update editor store so errors show in editor panel
      set_validation_error(error_msg);
      set_validation_errors(validation.errors);

      prepare_error_context({
        thread_id: props.sceneId,
        user_message: "",
        error_message: error_msg,
        invalid_json: code,
        scene: {
          id: props.sceneId,
          title: "",
          createdAt: 0,
          updatedAt: 0,
          currentVersionId: null,
          versions: [],
        },
        mode: "build",
      });
      const config = BANNERS.INVALID_SCENE_CODE;
      show_error(config.message, {
        title: config.title,
        actions: config.actions,
      });
    };

    // Attempt to execute scene code (in order of priority):
    // 1. If sceneCode is provided, execute it
    // 2. If no sceneCode, try to recover from last BUILD message in chat
    // 3. If no BUILD message with JSON found, leave template visible (grid)
    let code_to_execute = props.sceneCode;
    let should_attempt_recovery = false;

    // Check if we need to attempt BUILD recovery
    if (
      (!code_to_execute || code_to_execute.trim().length === 0) &&
      props.sceneId
    ) {
      const thread = get_thread(props.sceneId);

      // Get the most recent user message mode to determine if we're in BUILD mode
      for (let i = thread.messages.length - 1; i >= 0; i--) {
        if (thread.messages[i].role === "user") {
          if (thread.messages[i].meta?.mode === "build") {
            should_attempt_recovery = true;
          }
          break;
        }
      }

      if (should_attempt_recovery) {
        // Try to recover scene code from assistant messages using parse_model_output
        for (let i = thread.messages.length - 1; i >= 0; i--) {
          const msg = thread.messages[i];

          if (msg.role === "assistant" && msg.content) {
            const parsed = parse_model_output(msg.content, "build");

            if (parsed.kind === "scene") {
              code_to_execute = parsed.code;
              break;
            }
          }
        }

        // Show error if no valid scene code found - and prepare error context for Fix
        if (!code_to_execute) {
          prepare_error_context({
            thread_id: props.sceneId,
            user_message: "",
            error_message: "Could not recover scene code from chat",
            invalid_json: "",
            scene: {
              id: props.sceneId,
              title: "",
              createdAt: 0,
              updatedAt: 0,
              currentVersionId: null,
              versions: [],
            },
            mode: "build",
          });
          const config = BANNERS.INVALID_SCENE_CODE;
          show_error(config.message, {
            title: config.title,
            actions: config.actions,
          });
        }
      }
    }

    // Execute scene code if available
    if (code_to_execute && code_to_execute.trim().length > 0) {
      // Apply camera from scene code if present (only on initial load)
      const cameraConfig = extract_camera_from_code(code_to_execute);
      if (cameraConfig) {
        runtime.set_default_camera(cameraConfig.position, cameraConfig.lookat);
        if (cameraConfig.position) {
          runtime.camera.position.set(
            cameraConfig.position[0],
            cameraConfig.position[1],
            cameraConfig.position[2],
          );
        }
        if (cameraConfig.lookat) {
          runtime.controls.target.set(
            cameraConfig.lookat[0],
            cameraConfig.lookat[1],
            cameraConfig.lookat[2],
          );
        }
        runtime.controls.update();
      }

      const validation = validate_scene_code_internal(code_to_execute);
      if (validation.ok) {
        execute_validated_scene(code_to_execute, validation);
      } else {
        handle_validation_failure(code_to_execute, validation);
      }
    }

    // Add event listeners for selection and hover
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    label_container.addEventListener("click", handleLabelClick);

    // Add event listeners for drill navigation
    window.addEventListener("stemify:drill-up", handleDrillUp as EventListener);
    window.addEventListener(
      "stemify:drill-down",
      handleDrillDown as EventListener,
    );

    return () => {
      window.removeEventListener("stemify:camera-reset", on_reset);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      label_container.removeEventListener("click", handleLabelClick);
      window.removeEventListener(
        "stemify:drill-up",
        handleDrillUp as EventListener,
      );
      window.removeEventListener(
        "stemify:drill-down",
        handleDrillDown as EventListener,
      );

      if (raf_ref.current) {
        window.cancelAnimationFrame(raf_ref.current);
      }

      // Cancel animation loop before cleaning up scene_api_ref
      if (scene_api_result_ref.current) {
        scene_api_result_ref.current.cancel_animation();
      }

      runtime.dispose();
      fly_controls.dispose();
      runtime_ref.current = null;
      fly_controls_ref.current = null;
      registry_ref.current = null;
      scene_api_result_ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.sceneCode,
    props.sceneId,
    props.gridSnap,
    handleClick,
    handleMouseMove,
    handleMouseLeave,
    handleMouseDown,
    handleDrillUp,
    handleDrillDown,
    handleLabelClick,
    clearHighlight,
  ]);

  // Handle grid snap toggle
  useEffect(() => {
    if (props.gridSnap === prev_grid_snap_ref.current) return;
    prev_grid_snap_ref.current = props.gridSnap;

    if (!grid_state_ref.current) return;

    const new_enabled = props.gridSnap ?? false;
    if (grid_state_ref.current.enabled !== new_enabled) {
      grid_state_ref.current.enabled = new_enabled;
      props.onGridChangeAction?.(new_enabled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.gridSnap, props.onGridChangeAction]);

  return (
    <div
      ref={label_container_ref}
      className="relative h-full w-full overflow-hidden rounded-r-2xl bg-linear-to-b from-zinc-900 to-(--main-black)"
    >
      <canvas ref={canvas_ref} className="h-full w-full" />

      {/* Vertical Toolbar */}
      <div className="absolute left-2 top-2 z-10">
        <div className="flex flex-col items-start gap-3 rounded-outer p-2">
          {/* Logo */}
          <button
            type="button"
            onClick={props.onGoHomeAction}
            className="text-sm font-semibold text-white/80 tracking-tight px-1 select-none hover:text-white transition-colors cursor-pointer"
          >
            Stemify
          </button>

          {/* Divider - logo width */}
          <div className="w-16 h-px bg-white/10" />

          {/* Grid Toggle - same width as mode toggle */}
          <button
            type="button"
            onClick={() =>
              props.onGridChangeAction?.(!(props.gridSnap ?? false))
            }
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded transition-all duration-150 w-17",
              "border text-[10px]",
              (props.gridSnap ?? false)
                ? "bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
                : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white/80",
            )}
          >
            <Grid2X2Check className="w-3 h-3" />
            <span>snap</span>
          </button>

          {/* Reset */}
          <div className="flex items-center gap-0.5">
            <KeyboardShortcut
              keys={["R"]}
              onTrigger={props.onResetCameraAction ?? (() => {})}
              shortcutId="scene-reset"
              className="border border-white/5 bg-white/5"
            />
            <span className="text-[10px] text-white/50 ml-1">reset</span>
          </div>

          {/* Drill Up/Down */}
          <div className="flex items-center gap-0.5">
            <KeyboardShortcut
              keys={["["]}
              onTrigger={props.onDrillUpAction ?? (() => {})}
              shortcutId="drill-up"
              className="border border-white/5 bg-white/5"
            />
            <KeyboardShortcut
              keys={["]"]}
              onTrigger={props.onDrillDownAction ?? (() => {})}
              shortcutId="drill-down"
              className="border border-white/5 bg-white/5"
            />
            <span className="text-[10px] text-white/50 ml-1">drill</span>
          </div>

          {/* Mode Toggle */}
          <button
            type="button"
            onClick={() =>
              props.onCameraModeChangeAction?.(isFlyMode ? "rotate" : "fly")
            }
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded transition-all duration-150 w-17",
              "border text-[10px]",
              isFlyMode
                ? "bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
                : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white/80",
            )}
          >
            {isFlyMode ? (
              <Rocket className="w-3 h-3" />
            ) : (
              <Hand className="w-3 h-3" />
            )}
            <span>{isFlyMode ? "fly" : "rotate"}</span>
          </button>

          {/* Fly Mode Controls */}
          {isFlyMode && (
            <>
              {/* Divider - mode toggle width */}
              <div className="w-17 h-px bg-white/10" />

              {/* Move - W centered above AS D */}
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex items-center gap-0.5">
                  <span className="w-5.5" />
                  <KeyboardShortcut
                    keys={["W"]}
                    onTrigger={() => {}}
                    forceActive={flyKeys.forward}
                    className="border border-white/5 bg-white/5"
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <KeyboardShortcut
                    keys={["A"]}
                    onTrigger={() => {}}
                    forceActive={flyKeys.left}
                    className="border border-white/5 bg-white/5"
                  />
                  <KeyboardShortcut
                    keys={["S"]}
                    onTrigger={() => {}}
                    forceActive={flyKeys.backward}
                    className="border border-white/5 bg-white/5"
                  />
                  <KeyboardShortcut
                    keys={["D"]}
                    onTrigger={() => {}}
                    forceActive={flyKeys.right}
                    className="border border-white/5 bg-white/5"
                  />
                  <span className="text-[10px] text-white/50 ml-1">move</span>
                </div>
              </div>

              {/* Up/Down */}
              <div className="flex items-center gap-0.5">
                <KeyboardShortcut
                  keys={["Space"]}
                  onTrigger={() => {}}
                  forceActive={flyKeys.up}
                  className="border border-white/5 bg-white/5"
                />
                <KeyboardShortcut
                  keys={["Shift"]}
                  onTrigger={() => {}}
                  forceActive={flyKeys.down}
                  className="border border-white/5 bg-white/5"
                />
                <span className="text-[10px] text-white/50 ml-1">up/down</span>
              </div>

              {/* Roll */}
              <div className="flex items-center gap-0.5">
                <KeyboardShortcut
                  keys={["Q"]}
                  onTrigger={() => {}}
                  forceActive={flyKeys.rollLeft}
                  className="border border-white/5 bg-white/5"
                />
                <KeyboardShortcut
                  keys={["E"]}
                  onTrigger={() => {}}
                  forceActive={flyKeys.rollRight}
                  className="border border-white/5 bg-white/5"
                />
                <span className="text-[10px] text-white/50 ml-1">roll</span>
              </div>

              {/* Speed */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max={FLY_SPEED_OPTIONS.length - 1}
                  step="1"
                  value={flySpeedIndex ?? 1}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setFlySpeedIndex(value);
                    save_fly_speed_index(value);
                  }}
                  className="w-16 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white/80 [&::-webkit-slider-thumb]:rounded-full"
                />
                <div className="flex items-center gap-1 text-white/50">
                  {getSpeedIcon(FLY_SPEED_OPTIONS[flySpeedIndex ?? 1])}
                  <span className="text-[10px]">
                    {FLY_SPEED_OPTIONS[flySpeedIndex ?? 1]}x
                  </span>
                </div>
              </div>

              {/* Look (scroll) */}
              <div className="flex items-center gap-2 text-white/50">
                <Eye className="w-3 h-3" />
                <span className="text-[10px]">scroll</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Crosshair (fly mode only) */}
      {isFlyMode && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Crosshair className="w-4 h-4 text-white/40" />
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className={`absolute top-2 right-2 rounded-lg bg-zinc-900/90 border px-3 py-2 text-sm shadow-lg cursor-pointer hover:border-amber-400/50 ${selectedId?.startsWith("tooltip:") ? "border-amber-400" : "border-white/10"}`}
          onClick={() => {
            if (!selectedId) return;
            // Use tooltip: prefix to select the tooltip itself (not underlying object)
            // Avoid double prefix if already selected
            const underlyingId = selectedId.startsWith("tooltip:")
              ? selectedId.slice(8)
              : selectedId;
            const tooltipId = `tooltip:${underlyingId}`;
            const breadcrumbs = registry_ref.current
              ? [...registry_ref.current.find_path_to_root(underlyingId), tooltipId]
              : [tooltipId];
            window.dispatchEvent(
              new CustomEvent("stemify:select-object", {
                detail: { objectId: tooltipId, startObjectId: tooltipId, breadcrumbs },
              }),
            );
            window.dispatchEvent(new CustomEvent("stemify:open-editor"));
          }}
        >
          <div className="font-medium text-amber-400">{tooltip.title}</div>
          {tooltip.properties && typeof tooltip.properties === "string" && (
            <div className="mt-1 text-xs text-white/70">{tooltip.properties}</div>
          )}
          {tooltip.properties && typeof tooltip.properties !== "string" && tooltip.properties.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {tooltip.properties.map((prop, idx) => (
                <div key={idx} className="text-xs text-white/70">
                  <span className="text-white/50">{prop.label}:</span>{" "}
                  {prop.value}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function getSceneRegistry(): ObjectRegistry | null {
  return null;
}
