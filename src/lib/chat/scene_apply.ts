import { execute_scene_code } from "@/lib/scene/execute_scene_code";
import { create_scene_api } from "@/lib/scene/scene_api";
import { ObjectRegistry } from "@/lib/scene/object_registry";
import {
  create_three_base_template,
  type ThreeBaseTemplate,
} from "@/lib/three/base_template";

// NOTE: This module is intentionally tiny for Milestone 5.
// Validation is: "can we execute without throwing?".

export function validate_scene_code(scene_code: string): { ok: boolean; error?: string } {
  const trimmed = scene_code.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Scene code is empty." };
  }

  // MVP: validate by executing against a minimal in-memory scene API.
  // We don't want to mutate the real viewport until we know it won't throw.

  let template: ThreeBaseTemplate | null = null;

  try {
    const canvas = document.createElement("canvas");
    const labels = document.createElement("div");

    template = create_three_base_template(canvas, labels);
    const registry = new ObjectRegistry();
    const scene_api = create_scene_api({ template, registry });

    execute_scene_code(scene_code, scene_api);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  } finally {
    template?.dispose();
  }
}
