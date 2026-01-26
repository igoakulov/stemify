import type { SceneApi } from "@/lib/scene/types";

export function execute_scene_code(scene_code: string, scene: SceneApi): void {
  // MVP: sandbox-ish execution. This is intentionally minimal.
  // The code will be trusted to call only scene.addX() methods.
  // Guardrails (tokenization/AST validation) are deferred.
  const fn = new Function("scene", scene_code) as (scene: SceneApi) => void;
  fn(scene);
}
