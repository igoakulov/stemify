"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";

import { create_three_base_template, type ThreeBaseTemplate } from "@/lib/three/base_template";
import { create_scene_api, create_default_grid_state, type GridState } from "@/lib/scene/scene_api";
import { ObjectRegistry, type HoverData } from "@/lib/scene/object_registry";
import { execute_scene_code } from "@/lib/scene/execute_scene_code";
import { validate_scene } from "@/lib/scene/validation";
import { parse_model_output, get_scene_code } from "@/lib/chat/parse";
import { get_thread } from "@/lib/chat/store";
import { show_error, show_warning, BANNERS, prepare_error_context } from "@/lib/chat/banner";
import {
  resize_renderer_to_canvas,
} from "@/lib/three/base_template";
import { get_original_selected_id } from "@/lib/scene/editor_store";

export type SceneViewportProps = {
  sceneCode: string;
  sceneId: string;
  gridSnap?: boolean;
  onGridChange?: (enabled: boolean) => void;
};

const HOVER_COLOR = 0xfbbf24;
const HOVER_OPACITY = 0.2;
const SELECTED_OPACITY = 0.6;

export function SceneViewport(props: SceneViewportProps) {
  const canvas_ref = useRef<HTMLCanvasElement | null>(null);
  const label_container_ref = useRef<HTMLDivElement | null>(null);
  const runtime_ref = useRef<ThreeBaseTemplate | null>(null);
  const raf_ref = useRef<number | null>(null);
  const grid_state_ref = useRef<GridState | null>(null);
  const prev_grid_snap_ref = useRef<boolean | undefined>(undefined);
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
  const [tooltip, setTooltip] = useState<HoverData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Refs to store latest highlight functions for use in event listeners
  const applyHoverHighlightRef = useRef<(objectId: string | null) => void>(() => {});
  const applySelectionHighlightRef = useRef<(objectId: string | null) => void>(() => {});
  const clearSelectionHighlightRef = useRef<() => void>(() => {});

  // Sync with external selection events (like keyboard shortcuts, breadcrumbs clicks)
  // Also recalculates breadcrumbs if missing (e.g., when clicking breadcrumb in AppShell)
  useEffect(() => {
    const handleExternalSelect = (event: Event) => {
      const custom = event as CustomEvent<{ objectId: string | null; breadcrumbs?: string[]; originalSelectedId?: string | null }>;
      const objectId = custom.detail.objectId;
      
      // Apply selection highlight
      if (objectId) {
        applySelectionHighlightRef.current(objectId);
      } else {
        clearSelectionHighlightRef.current();
      }
      
      setSelectedId(objectId);
      selected_id_ref.current = objectId;
      
      // If breadcrumbs are missing but we have an object and registry, recalculate them
      if (objectId && registry_ref.current && !custom.detail.breadcrumbs) {
        // Preserve originalSelectedId if explicitly provided, otherwise use objectId
        const originalSelectedId = custom.detail.originalSelectedId !== undefined 
          ? custom.detail.originalSelectedId 
          : objectId;
        const breadcrumbs = originalSelectedId ? registry_ref.current.find_path_to_root(originalSelectedId) : [];
        // Re-dispatch with breadcrumbs included, preserving originalSelectedId
        window.dispatchEvent(new CustomEvent("stemify:select-object", { 
          detail: { 
            objectId, 
            breadcrumbs, 
            originalSelectedId: custom.detail.originalSelectedId
          } 
        }));
      }
    };
    
    window.addEventListener("stemify:select-object", handleExternalSelect);
    return () => window.removeEventListener("stemify:select-object", handleExternalSelect);
  }, []);

  const getPickedId = useCallback((event: MouseEvent): string | null => {
    const canvas = canvas_ref.current;
    if (!canvas || !runtime_ref.current) return null;

    const rect = canvas.getBoundingClientRect();
    mouse_ref.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse_ref.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster_ref.current.setFromCamera(mouse_ref.current, runtime_ref.current.camera);
    const intersects = raycaster_ref.current.intersectObjects(runtime_ref.current.root.children, true);

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
  const applyEmissiveToMesh = (mesh: THREE.Object3D, color: number, opacity: number) => {
    if (mesh instanceof THREE.Mesh && mesh.material) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.emissive) {
        mat.emissive.setHex(color);
        mat.emissiveIntensity = opacity;
      }
    } else if (mesh instanceof THREE.Group) {
      // For groups (like cylinders), apply to all children
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            mat.emissive.setHex(color);
            mat.emissiveIntensity = opacity;
          }
        }
      });
    }
  };

  // Helper to clear highlight from a mesh or all children of a group
  const clearEmissiveFromMesh = (mesh: THREE.Object3D) => {
    if (mesh instanceof THREE.Mesh && mesh.material) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.emissive) {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    } else if (mesh instanceof THREE.Group) {
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
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
    document.querySelectorAll('.css2d-label.label-hover').forEach((el) => {
      el.classList.remove('label-hover');
    });
  }, []);

  // Helper to check if a mesh is a child/descendant of another mesh
  const isDescendantOf = (child: THREE.Object3D, parent: THREE.Object3D): boolean => {
    if (child === parent) return true;
    let current: THREE.Object3D | null = child.parent;
    while (current) {
      if (current === parent) return true;
      current = current.parent;
    }
    return false;
  };

  const applyHoverHighlight = useCallback((objectId: string | null) => {
    // Get the mesh for the current hover target
    if (!objectId || !registry_ref.current) {
      // No target - clear previous highlight
      clearHighlight();
      return;
    }

    // Check if this is a label first
    const labelEl = document.querySelector(`.css2d-label[data-object-id="${objectId}"]`);
    if (labelEl) {
      // Clear previous 3D mesh highlight
      if (highlighted_mesh_ref.current) {
        clearEmissiveFromMesh(highlighted_mesh_ref.current);
        highlighted_mesh_ref.current = null;
      }
      // Clear previous label hover
      document.querySelectorAll('.css2d-label.label-hover').forEach((el) => {
        el.classList.remove('label-hover');
      });
      // Don't add hover class if already selected
      if (labelEl.classList.contains('label-selected')) return;
      labelEl.classList.add('label-hover');
      return;
    }

    // Get mesh from registry
    const mesh = registry_ref.current.get_mesh(objectId);
    if (!mesh) return;

    // Don't apply hover if this mesh (or its parent) is currently selected (keep selection highlight at 0.6)
    // Also check if a tooltip for this object is selected
    if (selected_mesh_ref.current && isDescendantOf(mesh, selected_mesh_ref.current)) return;

    // Skip if already hovering over this same mesh/group - avoid clearing and reapplying
    if (mesh === highlighted_mesh_ref.current) return;

    // Clear previous highlight (3D mesh or label)
    if (highlighted_mesh_ref.current) {
      clearEmissiveFromMesh(highlighted_mesh_ref.current);
    }
    document.querySelectorAll('.css2d-label.label-hover').forEach((el) => {
      el.classList.remove('label-hover');
    });

    // Apply new highlight
    applyEmissiveToMesh(mesh, HOVER_COLOR, HOVER_OPACITY);
    highlighted_mesh_ref.current = mesh;
  }, []);

  // Update ref when applyHoverHighlight changes
  useEffect(() => {
    applyHoverHighlightRef.current = applyHoverHighlight;
  }, [applyHoverHighlight]);

  const applySelectionHighlight = useCallback((objectId: string | null) => {
    // Clear previous selection first
    document.querySelectorAll('.css2d-label.label-selected').forEach((el) => {
      el.classList.remove('label-selected');
    });

    // Clear previous selected mesh highlight
    if (selected_mesh_ref.current) {
      clearEmissiveFromMesh(selected_mesh_ref.current);
      selected_mesh_ref.current = null;
    }

    if (!objectId || !registry_ref.current) return;

    // Handle tooltip: prefix - tooltips highlight their underlying object
    let actualObjectId = objectId;
    if (objectId.startsWith('tooltip:')) {
      actualObjectId = objectId.slice(8);
    }

    // Check if this is a label first (CSS2DObject) - can't use emissive on labels
    const labelEl = document.querySelector(`.css2d-label[data-object-id="${actualObjectId}"]`);
    if (labelEl) {
      labelEl.classList.add('label-selected');
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
    document.querySelectorAll('.css2d-label.label-selected').forEach((el) => {
      el.classList.remove('label-selected');
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

  const handleClick = useCallback((event: MouseEvent) => {
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
    setSelectedId(objectId);
    selected_id_ref.current = objectId;
    const breadcrumbs = objectId && registry_ref.current
      ? registry_ref.current.find_path_to_root(objectId)
      : [];
    // Clicking sets both selected and original to the clicked object
    window.dispatchEvent(new CustomEvent("stemify:select-object", { detail: { objectId, breadcrumbs, originalSelectedId: objectId } }));
    // Also open editor when clicking an object (even if already selected)
    if (objectId) {
      window.dispatchEvent(new CustomEvent("stemify:open-editor"));
    }
  }, [getPickedId]);

  const handleLabelClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const labelElement = target.closest('.css2d-label') as HTMLElement;
    if (labelElement) {
      const objectId = labelElement.dataset.objectId;
      if (objectId) {
        event.stopPropagation();
        setSelectedId(objectId);
        selected_id_ref.current = objectId;
        const breadcrumbs = registry_ref.current
          ? registry_ref.current.find_path_to_root(objectId)
          : [];
        // Clicking label sets both selected and original to the clicked object
        window.dispatchEvent(new CustomEvent("stemify:select-object", { detail: { objectId, breadcrumbs, originalSelectedId: objectId } }));
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
    const lookupId = selectedId.startsWith('tooltip:') ? selectedId.slice(8) : selectedId;
    const hoverData = registry_ref.current.get_hover_data(lookupId);
    // Only show tooltip if explicitly defined (don't fallback to object id)
    const timer = setTimeout(() => {
      setTooltip(hoverData ?? null);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedId]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
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
        if (hoveredObjId && hoveredObjId !== selected_id_ref.current && !selected_id_ref.current?.startsWith('tooltip:')) {
          setTooltip(null);
          tooltip_object_id_ref.current = null;
        }
      }
    } else if (!objectId && tooltip_object_id_ref.current) {
      // Moved to empty space - clear tooltip unless there's a selection
      if (!selected_id_ref.current?.startsWith('tooltip:') && tooltip_object_id_ref.current !== selected_id_ref.current) {
        setTooltip(null);
        tooltip_object_id_ref.current = null;
      }
    }
  }, [getPickedId]);

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

  const handleDrillUp = useCallback((event: CustomEvent<{ objectId: string }>) => {
    const { objectId } = event.detail;
    if (!registry_ref.current) return;
    
    const parentId = registry_ref.current.get_parent(objectId);
    if (parentId) {
      // Get the original selected leaf to show full path
      const originalSelectedId = get_original_selected_id() || objectId;
      const breadcrumbs = registry_ref.current.find_path_to_root(originalSelectedId);
      // Don't reset originalSelectedId - keep the leaf we originally selected
      window.dispatchEvent(new CustomEvent("stemify:select-object", { detail: { objectId: parentId, breadcrumbs, originalSelectedId } }));
      window.dispatchEvent(new CustomEvent("stemify:open-editor"));
    }
  }, []);

  const handleDrillDown = useCallback((event: CustomEvent<{ objectId: string }>) => {
    const { objectId } = event.detail;
    if (!registry_ref.current) return;
    
    const children = registry_ref.current.get_children(objectId);
    if (children.length > 0) {
      // Try to restore to original selected child, otherwise pick first child
      const originalSelectedId = get_original_selected_id();
      const targetId = originalSelectedId && children.includes(originalSelectedId) ? originalSelectedId : children[0];
      // Always use originalSelectedId for breadcrumbs to show full chain to original leaf
      const breadcrumbs = originalSelectedId ? registry_ref.current.find_path_to_root(originalSelectedId) : [];
      window.dispatchEvent(new CustomEvent("stemify:select-object", { detail: { objectId: targetId, breadcrumbs, originalSelectedId } }));
      window.dispatchEvent(new CustomEvent("stemify:open-editor"));
    }
  }, []);

  // Main scene setup and execution effect
  useEffect(() => {
    const canvas = canvas_ref.current;
    const label_container = label_container_ref.current;

    if (!canvas || !label_container) return;

    const runtime = create_three_base_template(canvas, label_container);
    runtime_ref.current = runtime;

    const on_reset = () => {
      runtime.reset_camera();
    };

    window.addEventListener("stemify:camera-reset", on_reset);

    // Save camera position before re-creating scene (preserve user's view)
    const existingRuntime = runtime_ref.current;
    if (existingRuntime) {
      saved_camera_position_ref.current = existingRuntime.camera.position.clone();
      saved_camera_target_ref.current = existingRuntime.controls.target.clone();
    }

    // Large ground grid: 20x20 units with 0.5 unit spacing
    const grid = new THREE.GridHelper(20, 40);
    grid.material = runtime.materials.grid_line;
    runtime.scene.add(grid);

    // Clear previous scene content
    while (runtime.root.children.length > 0) {
      runtime.root.remove(runtime.root.children[0]);
    }

    // Initialize grid state
    const grid_state = create_default_grid_state();
    grid_state.enabled = props.gridSnap ?? true;
    grid_state_ref.current = grid_state;

    const registry = new ObjectRegistry();
    registry_ref.current = registry;
    const scene_api = create_scene_api({ template: runtime, registry, gridConfig: grid_state });

    // Start render loop unconditionally - grid/template should always be visible
    const loop = () => {
      resize_renderer_to_canvas(runtime);
      runtime.controls.update();
      runtime.renderer.render(runtime.scene, runtime.camera);
      runtime.label_renderer.render(runtime.scene, runtime.camera);
      raf_ref.current = window.requestAnimationFrame(loop);
    };
    raf_ref.current = window.requestAnimationFrame(loop);

    // Execute scene code function
    const execute_scene = (code: string) => {
      const scene_obj = {
        id: props.sceneId,
        sceneCode: code,
        title: "",
        createdAt: 0,
        updatedAt: 0,
      };
      const validation = validate_scene(scene_obj);
      if (!validation.ok) {
        const error_msg = validation.error ?? "Invalid scene code";
        prepare_error_context({
          thread_id: props.sceneId,
          user_message: "",
          error_message: error_msg,
          invalid_json: code,
          scene: scene_obj,
          mode: "build",
        });
        const config = BANNERS.INVALID_SCENE_CODE;
        show_error(config.message, {
          title: config.title,
          actions: config.actions,
        });
      } else {
        if (validation.warnings && validation.warnings.length > 0) {
          const config = BANNERS.PERFORMANCE_WARNING(validation.warnings.join(", "));
          show_warning(config.message, { title: config.title });
        }
        execute_scene_code(code, scene_api);
      }
    };

    // Attempt to execute scene code (in order of priority):
    // 1. If sceneCode is provided, execute it
    // 2. If no sceneCode, try to recover from last BUILD message in chat
    // 3. If no BUILD message with JSON found, leave template visible (grid)
    let code_to_execute = props.sceneCode;
    let should_attempt_recovery = false;

    // Check if we need to attempt BUILD recovery
    if ((!code_to_execute || code_to_execute.trim().length === 0) && props.sceneId) {
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
        // Try to recover scene code from assistant messages
        let json_found = false;
        let invalid_json = false;

        for (let i = thread.messages.length - 1; i >= 0; i--) {
          const msg = thread.messages[i];

          if (msg.role === "assistant" && msg.content) {
            let content = msg.content;

            // Strip markdown code fences if present
            const codeBlockMatch = content.match(/```json?\s*\n?([\s\S]*?)\n?\s*```/);
            if (codeBlockMatch) {
              content = codeBlockMatch[1];
            }

            // Check if content looks like JSON (starts with {)
            if (content.trim().startsWith("{")) {
              json_found = true;

              // Try to parse as JSON
              const parsed = parse_model_output(content, "build");

              if (parsed.kind === "json") {
                const recovered_code = get_scene_code(parsed.payload);
                if (recovered_code) {
                  code_to_execute = recovered_code;
                  break;
                }
                invalid_json = true;
              } else {
                invalid_json = true;
              }
            }
          }
        }

        // Show error if JSON was found but invalid
        if (json_found && invalid_json) {
          const config = BANNERS.INVALID_SCENE_CODE;
          show_error(config.message, {
            title: config.title,
            actions: config.actions,
          });
        }

        // Show error if no JSON-like content found
        if (!json_found) {
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
      execute_scene(code_to_execute);
    }

    // Add event listeners for selection and hover
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    label_container.addEventListener("click", handleLabelClick);

    // Add event listeners for drill navigation
    window.addEventListener("stemify:drill-up", handleDrillUp as EventListener);
    window.addEventListener("stemify:drill-down", handleDrillDown as EventListener);

    return () => {
      window.removeEventListener("stemify:camera-reset", on_reset);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      label_container.removeEventListener("click", handleLabelClick);
      window.removeEventListener("stemify:drill-up", handleDrillUp as EventListener);
      window.removeEventListener("stemify:drill-down", handleDrillDown as EventListener);

      if (raf_ref.current) {
        window.cancelAnimationFrame(raf_ref.current);
      }

      runtime.dispose();
      runtime_ref.current = null;
      registry_ref.current = null;
    };
  }, [props.sceneCode, props.sceneId, handleClick, handleMouseMove, handleMouseLeave, handleMouseDown, clearHighlight]);

  // Handle grid snap toggle
  useEffect(() => {
    if (props.gridSnap === prev_grid_snap_ref.current) return;
    prev_grid_snap_ref.current = props.gridSnap;

    if (!grid_state_ref.current) return;

    const new_enabled = props.gridSnap ?? true;
    if (grid_state_ref.current.enabled !== new_enabled) {
      grid_state_ref.current.enabled = new_enabled;
      props.onGridChange?.(new_enabled);
      
      // Re-execute scene code with new grid settings
      if (props.sceneCode && props.sceneCode.trim().length > 0 && runtime_ref.current) {
        const registry = new ObjectRegistry();
        const scene_api = create_scene_api({ 
          template: runtime_ref.current, 
          registry, 
          gridConfig: grid_state_ref.current 
        });
        
        // Clear previous scene content
        while (runtime_ref.current.root.children.length > 0) {
          runtime_ref.current.root.remove(runtime_ref.current.root.children[0]);
        }
        
        const scene_obj = {
          id: props.sceneId,
          sceneCode: props.sceneCode,
          title: "",
          createdAt: 0,
          updatedAt: 0,
        };
        const validation = validate_scene(scene_obj);
        if (validation.ok) {
          execute_scene_code(props.sceneCode, scene_api);
        }
      }
    }
  }, [props.gridSnap, props.sceneCode, props.onGridChange]);

  return (
    <div
      ref={label_container_ref}
      className="relative h-full w-full overflow-hidden rounded-r-2xl bg-gradient-to-b from-zinc-900 to-zinc-950"
    >
      <canvas ref={canvas_ref} className="h-full w-full" />
      {tooltip && (
        <div 
          className={`absolute top-2 right-2 rounded-lg bg-zinc-900/90 border px-3 py-2 text-sm shadow-lg cursor-pointer hover:border-amber-400/50 ${selectedId?.startsWith('tooltip:') ? 'border-amber-400' : 'border-white/10'}`}
          onClick={() => {
            // Use tooltip: prefix to select the tooltip itself (not underlying object)
            // Avoid double prefix if already selected
            const tooltipId = selectedId?.startsWith('tooltip:') ? selectedId : `tooltip:${selectedId}`;
            window.dispatchEvent(new CustomEvent("stemify:select-object", { detail: { objectId: tooltipId, originalSelectedId: tooltipId } }));
            window.dispatchEvent(new CustomEvent("stemify:open-editor"));
          }}
        >
          <div className="font-medium text-amber-400">{tooltip.title}</div>
          {tooltip.properties && tooltip.properties.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {tooltip.properties.map((prop, idx) => (
                <div key={idx} className="text-xs text-white/70">
                  <span className="text-white/50">{prop.label}:</span> {prop.value}
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
