import type { ParsedScenePayload } from "@/lib/chat/parse";
import type { SavedScene } from "@/lib/scene/store";
import { validate_scene_code } from "@/lib/chat/scene_apply";

export type ValidationResult = {
  valid: boolean;
  error?: string;
  stage?: "json" | "structure" | "syntax" | "api" | "ids" | "attributes" | "format";
  warnings?: string[];
};

// Allowed API methods
const ALLOWED_METHODS = new Set([
  "addPoint",
  "addLine",
  "addPoly2D",
  "addCircle",
  "addSphere",
  "addCylinder",
  "addPoly3D",
  "addDonut",
  "addAxes",
  "addLabel",
  "addGroup",
  "addAnimation",
  "addCustomMesh",
  "addTooltip",
  "setGrid",
  "setSmoothness",
  "getObject",
  "listObjects",
]);

// Allowed attributes per method
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  addPoint: new Set(["id", "center", "color", "description"]),
  addLine: new Set([
    "id",
    "points",
    "thickness",
    "arrow",
    "rotation",
    "direction",
    "color",
    "opacity",
    "description",
  ]),
  addPoly2D: new Set(["id", "points", "color", "opacity", "direction", "rotation", "description"]),
  addCircle: new Set([
    "id",
    "center",
    "radius",
    "direction",
    "stretch",
    "slice",
    "rotation",
    "color",
    "opacity",
    "description",
  ]),
  addSphere: new Set([
    "id",
    "center",
    "radius",
    "stretch",
    "slice",
    "direction",
    "rotation",
    "color",
    "opacity",
    "description",
  ]),
  addCylinder: new Set(["id", "points", "radius", "slice", "direction", "rotation", "color", "opacity", "description"]),
  addPoly3D: new Set(["id", "points", "color", "opacity", "direction", "rotation", "description"]),
  addDonut: new Set([
    "id",
    "center",
    "radius",
    "thickness",
    "direction",
    "slice",
    "rotation",
    "color",
    "opacity",
    "description",
  ]),
  addAxes: new Set(["id", "x", "y", "z", "length", "position", "selectable", "description"]),
  addLabel: new Set(["id", "text", "position", "color", "fontSizePx"]),
  addGroup: new Set(["id", "children", "direction", "rotation", "description"]),
  addAnimation: new Set(["id", "updateFunction"]),
  addCustomMesh: new Set(["id", "createFn", "color", "direction", "rotation", "description"]),
  addTooltip: new Set(["id", "title", "properties"]),
  setGrid: new Set(["size"]),
  setSmoothness: new Set(["segments"]),
};

// Performance limits
const PERFORMANCE_LIMITS = {
  max_objects: 50,
  max_polygons: 100000,
  max_tube_segments: 100,
  max_labels: 20,
  max_animations: 3,
};

export function validate_llm_response(payload: ParsedScenePayload): ValidationResult {
  const warnings: string[] = [];

  const structure_result = validate_structure(payload);
  if (!structure_result.valid) {
    return structure_result;
  }

  const scene_code = payload.scene;
  if (typeof scene_code !== "string") {
    return {
      valid: false,
      error: "scene must be a string. See ## JSON Output for valid JSON format.",
      stage: "structure",
    };
  }

  const syntax_result = validate_javascript_syntax(scene_code);
  if (!syntax_result.valid) {
    return syntax_result;
  }

  const api_result = validate_api_methods(scene_code);
  if (!api_result.valid) {
    return api_result;
  }

  const attr_result = validate_attributes(scene_code);
  if (!attr_result.valid) {
    return attr_result;
  }

  const perf_result = check_performance_budget(scene_code);
  if (perf_result.warnings) {
    warnings.push(...perf_result.warnings);
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function validate_structure(payload: ParsedScenePayload): ValidationResult {
  if (!payload.scene) {
    return {
      valid: false,
      error: "Missing required field: scene. See ## JSON Output for valid JSON format.",
      stage: "structure",
    };
  }

  return { valid: true };
}

function validate_javascript_syntax(scene_code: string): ValidationResult {
  try {
    new Function("scene", scene_code);
    return { valid: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      valid: false,
      error: `Invalid JavaScript syntax: ${msg}. See ## Primitives for valid scene code.`,
      stage: "syntax",
    };
  }
}

function validate_api_methods(scene_code: string): ValidationResult {
  // Find all scene.XXX( calls
  const method_regex = /scene\.(\w+)\s*\(/g;
  const matches = [...scene_code.matchAll(method_regex)];

  for (const match of matches) {
    const method = match[1];
    if (!ALLOWED_METHODS.has(method)) {
      return {
        valid: false,
        error: `Unknown scene method: "${method}". See ## Primitives, ## Complex Shapes & Compositions, and ## Infrastructure for valid methods.`,
        stage: "api",
      };
    }
  }

  return { valid: true };
}

function validate_attributes(scene_code: string): ValidationResult {
  const method_call_regex = /scene\.(\w+)\s*\(/g;
  let match;

  while ((match = method_call_regex.exec(scene_code)) !== null) {
    const method = match[1];
    const call_start = match.index + match[0].length;

    if (!ALLOWED_METHODS.has(method)) {
      continue;
    }

    const allowed = ALLOWED_ATTRIBUTES[method];
    if (!allowed) {
      continue;
    }

    // Skip if no { after ( - this is not an object parameter call (e.g., setSmoothness(128))
    const code_after_paren = scene_code.slice(call_start);
    if (!code_after_paren.trim().startsWith("{")) {
      continue;
    }

    const top_level_keys = extract_top_level_keys(scene_code, call_start);

    for (const key of top_level_keys) {
      if (!allowed.has(key)) {
        return {
          valid: false,
          error: `Unknown attribute "${key}" in ${method}. See ## Primitives for valid attributes.`,
          stage: "attributes",
        };
      }
    }
  }

  return { valid: true };
}

function extract_top_level_keys(code: string, start_pos: number): string[] {
  const keys: string[] = [];
  let depth = 0;
  let in_string = false;
  let in_line_comment = false;
  let key_start = -1;
  let i = start_pos;

  while (i < code.length) {
    const char = code[i];

    // Handle line comments
    if (!in_string && char === "/" && code[i + 1] === "/") {
      in_line_comment = true;
      i += 2;
      continue;
    }

    if (in_line_comment) {
      if (char === "\n" || char === "\r") {
        in_line_comment = false;
      }
      i++;
      continue;
    }

    if (char === '"' || char === "'") {
      in_string = !in_string;
      i++;
      continue;
    }

    if (in_string) {
      i++;
      continue;
    }

    if (char === "{") {
      depth++;
    } else if (char === "}") {
      if (depth === 0) {
        break;
      }
      depth--;
    } else if (char === "[") {
      depth++;
    } else if (char === "]") {
      depth--;
    } else if (depth === 0 && char === ":") {
      if (key_start >= 0) {
        keys.push(code.slice(key_start, i).trim());
        key_start = -1;
      }
    } else if (depth === 0) {
      if (key_start === -1 && /[a-zA-Z_]/.test(char)) {
        if (i === 0 || /[\s,]/.test(code[i - 1])) {
          key_start = i;
        }
      }
    }

    i++;
  }

  return keys;
}

function check_performance_budget(
  scene_code: string
): { valid: boolean; warnings?: string[] } {
  const warnings: string[] = [];

  // Count objects by extracting unique IDs from scene code
  const id_regex = /id\s*:\s*["']([^"']+)["']/g;
  const declared_ids = new Set<string>();
  let match;
  while ((match = id_regex.exec(scene_code)) !== null) {
    declared_ids.add(match[1]);
  }
  const object_count = declared_ids.size;
  if (object_count > PERFORMANCE_LIMITS.max_objects) {
    warnings.push(
      `Scene has ${object_count} objects (limit: ${PERFORMANCE_LIMITS.max_objects})`
    );
  }

  // Count labels
  const label_regex = /scene\.addLabel\s*\(/g;
  const label_count = [...scene_code.matchAll(label_regex)].length;
  if (label_count > PERFORMANCE_LIMITS.max_labels) {
    warnings.push(
      `Scene has ${label_count} labels (limit: ${PERFORMANCE_LIMITS.max_labels})`
    );
  }

  // Count animations
  const animation_regex = /scene\.addAnimation\s*\(/g;
  const animation_count = [...scene_code.matchAll(animation_regex)].length;
  if (animation_count > PERFORMANCE_LIMITS.max_animations) {
    warnings.push(
      `Scene has ${animation_count} animations (limit: ${PERFORMANCE_LIMITS.max_animations})`
    );
  }

  // Estimate polygons (rough estimate)
  let estimated_polygons = 0;

  // Spheres: ~1000 polygons each (default segments)
  const sphere_regex = /scene\.addSphere\s*\(/g;
  const sphere_count = [...scene_code.matchAll(sphere_regex)].length;
  estimated_polygons += sphere_count * 1000;

  // Cylinders: ~100 polygons each
  const cylinder_regex = /scene\.addCylinder\s*\(/g;
  const cylinder_count = [...scene_code.matchAll(cylinder_regex)].length;
  estimated_polygons += cylinder_count * 100;

  // Poly3D: estimate based on vertices
  const poly3d_count = (scene_code.match(/scene\.addPoly3D\s*\(\s*\{[^}]*points\s*:\s*\[/g) || []).length;
  estimated_polygons += poly3d_count * 100;

  if (estimated_polygons > PERFORMANCE_LIMITS.max_polygons) {
    warnings.push(
      `Scene may exceed polygon budget (${estimated_polygons.toLocaleString()} estimated, limit: ${PERFORMANCE_LIMITS.max_polygons.toLocaleString()})`
    );
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// Grid snap utility
export function snap_to_grid(value: number, grid_size: number): number {
  return Math.round(value / grid_size) * grid_size;
}

// Unified scene validation - combines LLM response validation with code execution validation
export function validate_scene(scene: SavedScene): { ok: boolean; error?: string; warnings?: string[] } {
  const payload: ParsedScenePayload = {
    scene: scene.sceneCode,
    camera: scene.camera,
  };

  const llm_result = validate_llm_response(payload);
  if (!llm_result.valid) {
    return { ok: false, error: llm_result.error, warnings: llm_result.warnings };
  }

  const exec_result = validate_scene_code(scene.sceneCode);
  if (!exec_result.ok) {
    return { ok: false, error: exec_result.error };
  }

  return {
    ok: true,
    warnings: llm_result.warnings,
  };
}
