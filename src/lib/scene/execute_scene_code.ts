import type { SceneApi } from "@/lib/scene/types";
import { execute_in_sandbox } from "./sandbox";

export interface ExecutionError {
  message: string;
}

export function execute_scene_code(scene_code: string, scene: SceneApi): ExecutionError | null {
  try {
    const fn = new Function("scene", scene_code) as (scene: SceneApi) => void;
    return execute_in_sandbox(() => {
      fn(scene);
      return null;
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { message };
  }
}
