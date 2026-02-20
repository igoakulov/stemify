import type { ParsedScenePayload } from "@/lib/chat/parse";
import type { SavedScene } from "@/lib/scene/store";

export type ValidationErrorType = "syntax" | "method" | "attribute" | "value" | "runtime";

export type ValidationError = {
  type: ValidationErrorType;
  message: string;
  line?: number;
};

export type ValidationResult = {
  ok: boolean;
  errors: ValidationError[];
  warnings: string[];
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

// Allowed attributes per method (fixed: added selectable, removed description)
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  addPoint: new Set(["id", "center", "shift", "color", "selectable"]),
  addLine: new Set(["id", "points", "thickness", "arrow", "rotation", "direction", "shift", "color", "opacity", "selectable"]),
  addPoly2D: new Set(["id", "points", "shift", "color", "opacity", "direction", "rotation", "selectable"]),
  addCircle: new Set(["id", "center", "shift", "radius", "direction", "stretch", "anglecut", "rotation", "color", "opacity", "selectable"]),
  addSphere: new Set(["id", "center", "shift", "radius", "stretch", "anglecut", "flatcut", "direction", "rotation", "color", "opacity", "selectable"]),
  addCylinder: new Set(["id", "points", "shift", "radius", "anglecut", "direction", "rotation", "color", "opacity", "selectable"]),
  addPoly3D: new Set(["id", "points", "shift", "color", "opacity", "direction", "rotation", "selectable"]),
  addDonut: new Set(["id", "center", "shift", "radius", "thickness", "direction", "anglecut", "rotation", "color", "opacity", "selectable"]),
  addAxes: new Set(["id", "x", "y", "z", "length", "position", "selectable"]),
  addLabel: new Set(["id", "text", "position", "color", "fontSizePx", "selectable"]),
  addGroup: new Set(["id", "children", "direction", "rotation", "shift", "selectable"]),
  addAnimation: new Set(["id", "updateFunction"]),
  addCustomMesh: new Set(["id", "createFn", "center", "shift", "color", "direction", "rotation", "selectable"]),
  addTooltip: new Set(["id", "title", "properties"]),
  setGrid: new Set(["size"]),
  setSmoothness: new Set(["segments"]),
};

// Value type validators
type ValueValidator = (value: unknown, attribute: string, method: string) => string | null;

const validate_value: Record<string, ValueValidator> = {
  // String types
  id: (v) => typeof v === "string" ? null : `must be "text" (in quotes)`,
  text: (v) => typeof v === "string" ? null : `must be "text" (in quotes)`,
  title: (v) => typeof v === "string" ? null : `must be "text" (in quotes)`,
  updateFunction: (v) => typeof v === "string" ? null : `must be "text" (in quotes)`,
  createFn: (v) => typeof v === "string" ? null : `must be "text" (in quotes)`,

  // Number types (non-negative)
  radius: (v) => {
    if (typeof v !== "number") return `must be a number, got ${typeof v}`;
    return v >= 0 ? null : `must be non-negative, got ${v}`;
  },
  thickness: (v) => {
    if (typeof v !== "number") return `must be a number, got ${typeof v}`;
    return v >= 0 ? null : `must be non-negative, got ${v}`;
  },
  
  // Number types (any)
  rotation: (v) => typeof v === "number" ? null : `must be a number, got ${typeof v}`,
  opacity: (v) => {
    if (typeof v !== "number") return `must be a number, got ${typeof v}`;
    return (v >= 0 && v <= 1) ? null : `must be between 0 and 1, got ${v}`;
  },
  size: (v) => typeof v === "number" ? null : `must be a number, got ${typeof v}`,
  segments: (v) => typeof v === "number" ? null : `must be a number, got ${typeof v}`,
  fontSizePx: (v) => typeof v === "number" ? null : `must be a number, got ${typeof v}`,
  length: (v) => typeof v === "number" ? null : `must be a number, got ${typeof v}`,

  // Vec3 types
  direction: (v) => validate_vec3(v),
  center: (v) => validate_vec3(v),
  shift: (v) => validate_vec3(v),
  position: (v) => validate_vec3(v),
  stretch: (v) => validate_vec3(v),

  // Points (array of Vec3)
  points: (v) => {
    if (!Array.isArray(v)) return `must be like [[0,0,0], [1,1,1]]`;
    if (v.length < 2) return `must have at least 2 points`;
    for (let i = 0; i < v.length; i++) {
      if (!Array.isArray(v[i]) || v[i].length !== 3) {
        return `point ${i} must be [x, y, z]`;
      }
    }
    return null;
  },

  // Array of strings
  children: (v) => {
    if (!Array.isArray(v)) return `must be an array, got ${typeof v}`;
    for (let i = 0; i < v.length; i++) {
      if (typeof v[i] !== "string") return `children[${i}] must be a string, got ${typeof v[i]}`;
    }
    return null;
  },

  // Boolean - must be exactly true or false, not truthy/falsy values
  selectable: (v) => v === true || v === false ? null : `must be true or false, got ${JSON.stringify(v)}`,

  // Anglecut/Flatcut: number or [start, end]
  anglecut: (v) => {
    if (typeof v === "number") {
      return v <= 0 ? `must be > 0, got ${v}` : null;
    }
    if (Array.isArray(v)) {
      if (v.length === 0) return `must not be empty`;
      if (v.length !== 2) return `must be [start, end], got ${v.length} values`;
      if (typeof v[0] !== "number" || typeof v[1] !== "number") return `must be numbers`;
      if (v[1] <= v[0]) return `end (${v[1]}) must be > start (${v[0]})`;
      return null;
    }
    return `must be a number or [start, end], got ${typeof v}`;
  },
  flatcut: (v) => {
    if (typeof v === "number") {
      return v <= 0 ? `must be > 0, got ${v}` : null;
    }
    if (Array.isArray(v)) {
      if (v.length === 0) return `must not be empty`;
      if (v.length !== 2) return `must be [start, end], got ${v.length} values`;
      if (typeof v[0] !== "number" || typeof v[1] !== "number") return `must be numbers`;
      if (v[1] <= v[0]) return `end (${v[1]}) must be > start (${v[0]})`;
      return null;
    }
    return `must be a number or [start, end], got ${typeof v}`;
  },

  // Arrow
  arrow: (v) => {
    if (typeof v !== "string") return `must be a string, got ${typeof v}`;
    const valid = ["none", "end", "start", "both"];
    return valid.includes(v) ? null : `must be "none", "end", "start", or "both", got "${v}"`;
  },

  // Axes booleans - must be exactly true or false
  x: (v) => v === true || v === false ? null : `must be true or false, got ${JSON.stringify(v)}`,
  y: (v) => v === true || v === false ? null : `must be true or false, got ${JSON.stringify(v)}`,
  z: (v) => v === true || v === false ? null : `must be true or false, got ${JSON.stringify(v)}`,

  // Color - allow any string (will be parsed later)
  color: (v) => typeof v === "string" ? null : `must be a string, got ${typeof v}`,

  // properties - any object
  properties: (v) => (typeof v === "object" && v !== null) || Array.isArray(v) ? null : `must be an object or array, got ${typeof v}`,
};

function validate_vec3(v: unknown, path = ""): string | null {
  if (!Array.isArray(v)) return `must be [x, y, z]${path}, like [1, 2, 3]`;
  if (v.length !== 3) return `must be [x, y, z]${path}, got ${v.length} numbers instead of 3`;
  for (let i = 0; i < 3; i++) {
    if (typeof v[i] !== "number") {
      const labels = ["x", "y", "z"];
      return `${labels[i]} in [x, y, z]${path} must be a number, got ${typeof v[i]}`;
    }
  }
  return null;
}

// Performance limits
const PERFORMANCE_LIMITS = {
  max_objects: 50,
  max_polygons: 100000,
  max_tube_segments: 100,
  max_labels: 20,
  max_animations: 3,
};

export function validate_scene_code(scene_code: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // 1. Syntax validation
  try {
    new Function("scene", scene_code);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push({
      type: "syntax",
      message: `Syntax error: ${msg}`,
    });
  }

  // If syntax invalid, we can't reliably parse further - but still try for better errors
  const syntax_valid = errors.length === 0;

  // 2. API method validation (find all unknown methods)
  if (syntax_valid) {
    const method_regex = /scene\.(\w+)\s*\(/g;
    const seen_methods = new Set<string>();
    let match;
    while ((match = method_regex.exec(scene_code)) !== null) {
      const method = match[1];
      if (!seen_methods.has(method)) {
        seen_methods.add(method);
        if (!ALLOWED_METHODS.has(method)) {
          errors.push({
            type: "method",
            message: `Unknown method: "${method}"`,
          });
        }
      }
    }
  }

  // 3. Attribute validation (find all unknown attributes)
  if (syntax_valid) {
    const method_call_regex = /scene\.(\w+)\s*\(/g;
    let match;
    while ((match = method_call_regex.exec(scene_code)) !== null) {
      const method = match[1];
      if (!ALLOWED_METHODS.has(method)) continue;

      const call_start = match.index + match[0].length;
      const code_after_paren = scene_code.slice(call_start);
      if (!code_after_paren.trim().startsWith("{")) continue;

      const allowed = ALLOWED_ATTRIBUTES[method];
      if (!allowed) continue;

      const top_level_keys = extract_top_level_keys(scene_code, call_start);
      for (const key of top_level_keys) {
        if (!allowed.has(key)) {
          errors.push({
            type: "attribute",
            message: `Unknown attribute "${key}" in ${method}`,
          });
        }
      }
    }
  }

  // 4. Value format validation
  if (syntax_valid) {
    const method_call_regex = /scene\.(\w+)\s*\(/g;
    let match;
    while ((match = method_call_regex.exec(scene_code)) !== null) {
      const method = match[1];
      if (!ALLOWED_METHODS.has(method)) continue;

      const call_start = match.index + match[0].length;
      const code_after_paren = scene_code.slice(call_start);
      if (!code_after_paren.trim().startsWith("{")) continue;

      const allowed = ALLOWED_ATTRIBUTES[method];
      if (!allowed) continue;

      const attributes = extract_attribute_values(scene_code, call_start);
      for (const { key, value } of attributes) {
        if (!allowed.has(key)) continue; // Skip unknown attributes (already reported)
        
        const validator = validate_value[key];
        if (validator) {
          const error = validator(value, key, method);
          if (error) {
            errors.push({
              type: "value",
              message: `Invalid value for "${key}" in ${method}: ${error}`,
            });
          }
        }
      }
    }
  }

  // 5. Runtime execution check - catches errors like undefined variables (yes vs true)
  if (syntax_valid && errors.length === 0) {
    try {
      // Create a mock scene API that tracks calls
      const mockScene: Record<string, unknown> = {};
      for (const method of ALLOWED_METHODS) {
        mockScene[method] = () => {}; // No-op for all methods
      }
      
      // Try to execute - this will catch runtime errors like "can't find variable: yes"
      const fn = new Function("scene", scene_code);
      fn(mockScene);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({
        type: "runtime",
        message: msg,
      });
    }
  }

  // 6. Performance warnings
  const perf_warnings = check_performance_budget(scene_code);
  warnings.push(...perf_warnings);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function extract_attribute_values(code: string, start_pos: number): Array<{ key: string; value: unknown }> {
  const result: Array<{ key: string; value: unknown }> = [];
  
  // Find the object literal in the code (from { to matching })
  const objStart = code.indexOf("{", start_pos);
  if (objStart === -1) return result;
  
  // Find the closing } - be careful with nested braces
  let braceDepth = 0;
  let objEnd = -1;
  for (let i = objStart; i < code.length; i++) {
    if (code[i] === "{") braceDepth++;
    else if (code[i] === "}") {
      braceDepth--;
      if (braceDepth === 0) {
        objEnd = i;
        break;
      }
    }
  }
  
  if (objEnd === -1) return result;
  
  let objCode = code.slice(objStart, objEnd + 1);
  
  // Remove comments first - line comments (//) and block comments (/* */)
  objCode = objCode.replace(/\/\/.*$/gm, ""); // Remove // comments
  objCode = objCode.replace(/\/\*[\s\S]*?\*\//g, ""); // Remove /* */ comments

  // Remove template literal content to avoid matching key: value pairs inside them
  // Template literals can span multiple lines and contain ${} expressions
  objCode = objCode.replace(/`(?:[^`\\]|\\.)*`/g, '""');
  
  // Remove single and double quoted strings to avoid matching inside them
  // Use a unique placeholder that won't validate as any real value
  objCode = objCode.replace(/'(?:[^'\\]|\\.)*'/g, '"__STRING__"');
  objCode = objCode.replace(/"(?:[^"\\]|\\.)*"/g, '"__STRING__"');
  
  // Use a simpler regex approach - find all key: value pairs
  // Match: key: value with support for nested arrays/objects
  const kvRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^\n,}]+)/g;
  let match;
  
  while ((match = kvRegex.exec(objCode)) !== null) {
    const key = match[1];
    const valueStr = match[2].trim();
    
    // Skip empty values
    if (!valueStr) continue;
    
    // Try to parse the value
    let value: unknown;
    try {
      value = JSON.parse(valueStr);
    } catch {
      // If JSON parse fails, it might be a bare identifier or expression
      // Try to handle common cases
      if (valueStr === "true") value = true;
      else if (valueStr === "false") value = false;
      else if (valueStr === "null") value = null;
      else if (!isNaN(Number(valueStr))) value = Number(valueStr);
      else continue; // Skip unparseable values
    }
    
    // Skip placeholder values from string replacement - we can't validate the actual string content
    if (value === "__STRING__") continue;
    
    result.push({ key, value });
  }
  
  return result;
}

function extract_top_level_keys(code: string, start_pos: number): string[] {
  const keys: string[] = [];
  
  // Find the opening {
  const objStart = code.indexOf("{", start_pos);
  if (objStart === -1) return keys;
  
  // Parse the object literal manually
  let braceDepth = 0;
  let inString = false;
  let stringChar = "";
  let inBlockComment = false;
  let inLineComment = false;
  let keyStart = -1;
  
  for (let i = objStart; i < code.length; i++) {
    const char = code[i];
    
    // Handle block comments /* */
    if (!inString && !inLineComment && char === "/" && code[i + 1] === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (char === "*" && code[i + 1] === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    
    // Handle line comments //
    if (!inString && char === "/" && code[i + 1] === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
      }
      continue;
    }
    
    // Handle strings (track escape sequences)
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      continue;
    }
    if (inString) {
      if (char === "\\") {
        i++; // Skip escape character
        continue;
      }
      if (char === stringChar) {
        inString = false;
      }
      continue;
    }
    
    // Track brace depth
    if (char === "{") {
      braceDepth++;
    } else if (char === "}") {
      braceDepth--;
      if (braceDepth === 0) break; // Stop after closing the outer object
    }
    
    // Skip nested objects/arrays (depth > 1 means we're inside a nested object)
    if (braceDepth > 1) continue;
    
    // Find keys
    if (keyStart === -1) {
      if (/[a-zA-Z_]/.test(char)) {
        keyStart = i;
      }
    } else {
      if (char === ":") {
        keys.push(code.slice(keyStart, i).trim());
        keyStart = -1;
      } else if (!/[a-zA-Z0-9_]/.test(char)) {
        keyStart = -1;
      }
    }
  }
  
  return keys;
}

function check_performance_budget(scene_code: string): string[] {
  const warnings: string[] = [];

  const id_regex = /id\s*:\s*["']([^"']+)["']/g;
  const declared_ids = new Set<string>();
  let match;
  while ((match = id_regex.exec(scene_code)) !== null) {
    declared_ids.add(match[1]);
  }
  const object_count = declared_ids.size;
  if (object_count > PERFORMANCE_LIMITS.max_objects) {
    warnings.push(`Scene has ${object_count} objects (limit: ${PERFORMANCE_LIMITS.max_objects})`);
  }

  const label_regex = /scene\.addLabel\s*\(/g;
  const label_count = [...scene_code.matchAll(label_regex)].length;
  if (label_count > PERFORMANCE_LIMITS.max_labels) {
    warnings.push(`Scene has ${label_count} labels (limit: ${PERFORMANCE_LIMITS.max_labels})`);
  }

  const animation_regex = /scene\.addAnimation\s*\(/g;
  const animation_count = [...scene_code.matchAll(animation_regex)].length;
  if (animation_count > PERFORMANCE_LIMITS.max_animations) {
    warnings.push(`Scene has ${animation_count} animations (limit: ${PERFORMANCE_LIMITS.max_animations})`);
  }

  let estimated_polygons = 0;

  const sphere_regex = /scene\.addSphere\s*\(/g;
  const sphere_count = [...scene_code.matchAll(sphere_regex)].length;
  estimated_polygons += sphere_count * 1000;

  const cylinder_regex = /scene\.addCylinder\s*\(/g;
  const cylinder_count = [...scene_code.matchAll(cylinder_regex)].length;
  estimated_polygons += cylinder_count * 100;

  const poly3d_count = (scene_code.match(/scene\.addPoly3D\s*\(\s*\{[^}]*points\s*:\s*\[/g) || []).length;
  estimated_polygons += poly3d_count * 100;

  if (estimated_polygons > PERFORMANCE_LIMITS.max_polygons) {
    warnings.push(`Scene may exceed polygon budget (${estimated_polygons.toLocaleString()} estimated, limit: ${PERFORMANCE_LIMITS.max_polygons.toLocaleString()})`);
  }

  return warnings;
}

export function snap_to_grid(value: number, grid_size: number): number {
  return Math.round(value / grid_size) * grid_size;
}

export function validate_scene(scene: SavedScene): ValidationResult {
  return validate_scene_code(scene.sceneCode);
}

export function validate_llm_response(payload: ParsedScenePayload): ValidationResult {
  if (!payload.scene) {
    return {
      ok: false,
      errors: [{ type: "syntax", message: "Missing required field: scene" }],
      warnings: [],
    };
  }

  if (typeof payload.scene !== "string") {
    return {
      ok: false,
      errors: [{ type: "syntax", message: "scene must be a string" }],
      warnings: [],
    };
  }

  return validate_scene_code(payload.scene);
}
