"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { create_three_base_template, type ThreeBaseTemplate } from "@/lib/three/base_template";
import { create_scene_api } from "@/lib/scene/scene_api";
import { ObjectRegistry } from "@/lib/scene/object_registry";
import { execute_scene_code } from "@/lib/scene/execute_scene_code";
import { validate_scene_code } from "@/lib/chat/scene_apply";
import { parse_model_output, get_scene_code } from "@/lib/chat/parse";
import { get_thread } from "@/lib/chat/store";
import { show_error, show_warning, BANNERS } from "@/lib/chat/banner";
import {
  resize_renderer_to_canvas,
} from "@/lib/three/base_template";

export type SceneViewportProps = {
  sceneCode: string;
  sceneId: string;
};

export function SceneViewport(props: SceneViewportProps) {
  const canvas_ref = useRef<HTMLCanvasElement | null>(null);
  const label_container_ref = useRef<HTMLDivElement | null>(null);
  const runtime_ref = useRef<ThreeBaseTemplate | null>(null);
  const raf_ref = useRef<number | null>(null);

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

    const grid = new THREE.GridHelper(10, 10);
    grid.material = runtime.materials.grid_line;
    runtime.scene.add(grid);

    // Clear previous scene content
    while (runtime.root.children.length > 0) {
      runtime.root.remove(runtime.root.children[0]);
    }

    const registry = new ObjectRegistry();
    const scene_api = create_scene_api({ template: runtime, registry });

    // Start render loop unconditionally - grid/template should always be visible
    const loop = () => {
      resize_renderer_to_canvas(runtime);
      runtime.controls.update();
      runtime.renderer.render(runtime.scene, runtime.camera);
      runtime.label_renderer.render(runtime.scene, runtime.camera);
      raf_ref.current = window.requestAnimationFrame(loop);
    };
    raf_ref.current = window.requestAnimationFrame(loop);

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

        // Show warning if no JSON-like content found
        if (!json_found) {
          const config = BANNERS.NOTHING_TO_BUILD;
          show_warning(config.message, {
            title: config.title,
            actions: config.actions,
          });
        }
      }
    }

    // Execute scene code if available
    if (code_to_execute && code_to_execute.trim().length > 0) {
      const validation = validate_scene_code(code_to_execute);
      if (!validation.ok) {
        const config = BANNERS.INVALID_SCENE_CODE;
        show_error(config.message, {
          title: config.title,
          actions: config.actions,
        });
      } else {
        execute_scene_code(code_to_execute, scene_api);
      }
    }

    return () => {
      window.removeEventListener("stemify:camera-reset", on_reset);

      if (raf_ref.current) {
        window.cancelAnimationFrame(raf_ref.current);
      }

      runtime.dispose();
      runtime_ref.current = null;
    };
  }, [props.sceneCode, props.sceneId]);

  return (
    <div
      ref={label_container_ref}
      className="relative h-full w-full overflow-hidden rounded-r-2xl bg-gradient-to-b from-zinc-900 to-zinc-950"
    >
      <canvas ref={canvas_ref} className="h-full w-full" />
    </div>
  );
}
