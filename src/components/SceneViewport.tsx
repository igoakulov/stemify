"use client";

import { useEffect, useRef } from "react";

import * as THREE from "three";

import { ObjectRegistry } from "@/lib/scene/object_registry";
import { execute_scene_code } from "@/lib/scene/execute_scene_code";
import { create_scene_api } from "@/lib/scene/scene_api";
import {
  create_three_base_template,
  resize_renderer_to_canvas,
  type ThreeBaseTemplate,
} from "@/lib/three/base_template";

export type SceneViewportProps = {
  sceneCode: string;
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

    if (props.sceneCode.trim().length > 0) {
      execute_scene_code(props.sceneCode, scene_api);
    }

    const loop = () => {
      resize_renderer_to_canvas(runtime);
      runtime.controls.update();
      runtime.renderer.render(runtime.scene, runtime.camera);
      runtime.label_renderer.render(runtime.scene, runtime.camera);
      raf_ref.current = window.requestAnimationFrame(loop);
    };

    raf_ref.current = window.requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("stemify:camera-reset", on_reset);

      if (raf_ref.current) {
        window.cancelAnimationFrame(raf_ref.current);
      }

      runtime.dispose();
      runtime_ref.current = null;
    };
  }, [props.sceneCode]);

  return (
    <div
      ref={label_container_ref}
      className="relative h-full w-full overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950"
    >
      <canvas ref={canvas_ref} className="h-full w-full" />
    </div>
  );
}
