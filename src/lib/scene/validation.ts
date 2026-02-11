import type { ParsedScenePayload } from "@/lib/chat/parse";

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
    "slice",
    "rotation",
    "color",
    "opacity",
    "description",
  ]),
  addPoly2D: new Set(["id", "points", "color", "opacity", "rotation", "description"]),
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
  addCylinder: new Set(["id", "points", "radius", "color", "opacity", "description"]),
  addPoly3D: new Set(["id", "points", "color", "opacity", "description"]),
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
  addGroup: new Set(["id", "children", "description"]),
  addAnimation: new Set(["id", "updateFunction"]),
  addCustomMesh: new Set(["id", "createFn", "color", "description"]),
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

  // Stage 1: Validate structure
  const structure_result = validate_structure(payload);
  if (!structure_result.valid) return structure_result;

  // Stage 2: Get and validate scene code
  const scene_code = payload.scene.sceneCode;
  if (typeof scene_code !== "string") {
    return {
      valid: false,
      error: "scene.sceneCode must be a string",
      stage: "structure",
    };
  }

  // Stage 3: Validate JavaScript syntax
  const syntax_result = validate_javascript_syntax(scene_code);
  if (!syntax_result.valid) return syntax_result;

  // Stage 4: Validate API methods
  const api_result = validate_api_methods(scene_code);
  if (!api_result.valid) return api_result;

  // Stage 5: Validate object IDs
  const objects_array = Array.isArray(payload.scene.objects) ? payload.scene.objects : [];
  const ids_result = validate_object_ids(scene_code, objects_array);
  if (!ids_result.valid) return ids_result;

  // Stage 6: Validate attributes
  const attr_result = validate_attributes(scene_code);
  if (!attr_result.valid) return attr_result;

  // Stage 7: Validate coordinate format
  const coord_result = validate_coordinate_format(scene_code);
  if (!coord_result.valid) return coord_result;

  // Stage 8: Check for comments
  const comment_result = validate_no_comments(scene_code);
  if (!comment_result.valid) return comment_result;

  // Stage 9: Performance budget check
  const perf_result = check_performance_budget(scene_code, objects_array);
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
      error: "Missing required field: scene",
      stage: "structure",
    };
  }

  if (!payload.scene.sceneCode) {
    return {
      valid: false,
      error: "Missing required field: scene.sceneCode",
      stage: "structure",
    };
  }

  if (!payload.scene.objects) {
    return {
      valid: false,
      error: "Missing required field: scene.objects",
      stage: "structure",
    };
  }

  if (!Array.isArray(payload.scene.objects)) {
    return {
      valid: false,
      error: "scene.objects must be an array",
      stage: "structure",
    };
  }

  for (const obj of payload.scene.objects) {
    if (!obj.id || typeof obj.id !== "string") {
      return {
        valid: false,
        error: "Each object must have an 'id' string",
        stage: "structure",
      };
    }
    if (!obj.type || typeof obj.type !== "string") {
      return {
        valid: false,
        error: `Object "${obj.id}" must have a 'type' string`,
        stage: "structure",
      };
    }
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
      error: `Invalid JavaScript syntax: ${msg}`,
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
        error: `Unknown scene method: "${method}". Allowed methods: ${Array.from(ALLOWED_METHODS).sort().join(", ")}`,
        stage: "api",
      };
    }
  }

  return { valid: true };
}

function validate_object_ids(
  scene_code: string,
  objects: unknown[]
): ValidationResult {
  // Extract all id declarations from sceneCode
  const id_regex = /id\s*:\s*["']([^"']+)["']/g;
  const declared_ids = new Set<string>();
  let match;

  while ((match = id_regex.exec(scene_code)) !== null) {
    declared_ids.add(match[1]);
  }

  // Extract all IDs from objects array
  const object_ids = new Set<string>();
  for (const obj of objects as Array<{ id: string }>) {
    if (obj.id) object_ids.add(obj.id);
  }

  // Check consistency
  const missing_from_objects = [...declared_ids].filter((id) => !object_ids.has(id));
  const extra_in_objects = [...object_ids].filter((id) => !declared_ids.has(id));

  if (missing_from_objects.length > 0) {
    return {
      valid: false,
      error: `Scene code declares IDs not in objects array: ${missing_from_objects.join(", ")}`,
      stage: "ids",
    };
  }

  if (extra_in_objects.length > 0) {
    return {
      valid: false,
      error: `Objects array contains IDs not in scene code: ${extra_in_objects.join(", ")}`,
      stage: "ids",
    };
  }

  return { valid: true };
}

function validate_attributes(scene_code: string): ValidationResult {
  // For each method call, check that only allowed attributes are used
  // This is a simplified check - it looks for the pattern scene.method({ ... })

  const method_call_regex = /scene\.(\w+)\s*\(\s*\{([^}]+)\}\s*\)/g;
  let match;

  while ((match = method_call_regex.exec(scene_code)) !== null) {
    const method = match[1];
    const content = match[2];

    if (!ALLOWED_METHODS.has(method)) {
      continue; // Will be caught by validate_api_methods
    }

    const allowed = ALLOWED_ATTRIBUTES[method];
    if (!allowed) {
      continue; // No validation for this method
    }

    // Extract attribute names (simplified - looks for word before :)
    const attr_regex = /(\w+)\s*:/g;
    let attr_match;

    while ((attr_match = attr_regex.exec(content)) !== null) {
      const attr = attr_match[1];

      // Skip if it's a value in an object literal
      const before = content.slice(0, attr_match.index);
      const open_braces = (before.match(/\{/g) || []).length;
      const close_braces = (before.match(/\}/g) || []).length;

      // If we're inside nested braces, it might be a nested object property
      // This is a simplified check
      if (!allowed.has(attr)) {
        return {
          valid: false,
          error: `Unknown attribute "${attr}" in ${method}. Allowed attributes: ${Array.from(allowed).sort().join(", ")}`,
          stage: "attributes",
        };
      }
    }
  }

  return { valid: true };
}

function validate_coordinate_format(scene_code: string): ValidationResult {
  // Check for array coordinates [x, y, z]
  // But be careful not to match inside strings or comments

  // Remove strings first to avoid false positives
  const code_without_strings = scene_code.replace(/["']([^"']*)["']/g, '""');

  // Check for array pattern that looks like coordinates
  const array_coord_regex = /\[\s*-?\d+\.?\d*\s*,\s*-?\d+\.?\d*\s*,\s*-?\d+\.?\d*\s*\]/;

  if (array_coord_regex.test(code_without_strings)) {
    return {
      valid: false,
      error: "Coordinates must use { x, y, z } objects, not [x, y, z] arrays",
      stage: "format",
    };
  }

  return { valid: true };
}

function validate_no_comments(scene_code: string): ValidationResult {
  // Remove strings first
  const code_without_strings = scene_code.replace(/["']([^"']*)["']/g, '""');

  // Check for comments
  if (code_without_strings.includes("//") || code_without_strings.includes("/*")) {
    return {
      valid: false,
      error: "Comments not allowed in sceneCode (system adds them deterministically)",
      stage: "syntax",
    };
  }

  return { valid: true };
}

function check_performance_budget(
  scene_code: string,
  objects: unknown
): { valid: boolean; warnings?: string[] } {
  const warnings: string[] = [];

  // Count objects
  const object_count = Array.isArray(objects) ? objects.length : 0;
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
  const poly3d_matches = [...scene_code.matchAll(/scene\.addPoly3D\s*\(\s*\{[^}]*points\s*:\s*\[/g)];
  for (const _match of poly3d_matches) {
    estimated_polygons += 100; // rough estimate
  }

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

// Apply grid snap to coordinates in scene code
export function apply_grid_snap(scene_code: string, grid_size: number): string {
  // This is a simplified implementation
  // A full implementation would parse the code and snap all coordinate values
  return scene_code;
}
