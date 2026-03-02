import { get_scene_code, type SavedScene } from "@/lib/scene/store";

function strip_comments(code: string): string {
  let result = "";
  let in_string = false;
  let string_char = "";
  let in_block_comment = false;
  let in_line_comment = false;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];

    if (in_string) {
      result += char;
      if (char === "\\") {
        result += code[++i];
        continue;
      }
      if (char === string_char) {
        in_string = false;
      }
      continue;
    }

    if (in_block_comment) {
      if (char === "*" && code[i + 1] === "/") {
        in_block_comment = false;
        i++;
      }
      continue;
    }

    if (in_line_comment) {
      if (char === "\n") {
        in_line_comment = false;
        result += char;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      in_string = true;
      string_char = char;
      result += char;
      continue;
    }

    if (char === "/" && code[i + 1] === "*") {
      in_block_comment = true;
      i++;
      continue;
    }

    if (char === "/" && code[i + 1] === "/") {
      in_line_comment = true;
      i++;
      continue;
    }

    result += char;
  }

  return result;
}

export type ValidationErrorType = "syntax" | "method" | "parameter" | "value" | "runtime";

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
const VALID_METHODS = new Set([
  "point",
  "line",
  "curve",
  "poly2",
  "circle",
  "sphere",
  "cylinder",
  "poly3",
  "donut",
  "axes",
  "label",
  "group",
  "animation",
  "mesh",
  "tooltip",
  "grid",
  "smoothness",
  "camera",
  "getObject",
  "listObjects",
]);

// Allowed attributes per method
const VALID_PARAMETERS: Record<string, Set<string>> = {
  point: new Set(["id", "position", "offset", "color", "selectable"]),
  line: new Set(["id", "points", "tension", "lookat", "spin", "thickness", "arrow", "offset", "color", "selectable"]),
  curve: new Set(["id", "steps", "tMin", "tMax", "x", "y", "z", "lookat", "spin", "thickness", "arrow", "offset", "color", "selectable"]),
  poly2: new Set(["id", "points", "offset", "position", "color", "opacity", "lookat", "spin", "selectable"]),
  circle: new Set(["id", "position", "offset", "radius", "lookat", "stretch", "anglecut", "spin", "color", "opacity", "outline", "selectable"]),
  sphere: new Set(["id", "position", "offset", "radius", "stretch", "anglecut", "flatcut", "lookat", "spin", "color", "opacity", "selectable"]),
  cylinder: new Set(["id", "position", "height", "radius", "offset", "anglecut", "spin", "lookat", "color", "opacity", "selectable"]),
  poly3: new Set(["id", "points", "position", "offset", "color", "opacity", "lookat", "spin", "selectable"]),
  donut: new Set(["id", "position", "offset", "radius", "thickness", "lookat", "anglecut", "spin", "color", "opacity", "selectable"]),
  axes: new Set(["id", "x", "y", "z", "position", "selectable"]),
  label: new Set(["id", "text", "position", "color", "fontSizePx", "selectable"]),
  group: new Set(["id", "children", "lookat", "spin", "offset", "selectable"]),
  animation: new Set(["id", "updateFunction"]),
  mesh: new Set(["id", "createFn", "position", "offset", "color", "lookat", "spin", "selectable"]),
  tooltip: new Set(["id", "title", "properties"]),
  grid: new Set(["size"]),
  smoothness: new Set(["segments"]),
  camera: new Set(["position", "lookat"]),
};

// Array schema definitions
type ArraySchema = 
  | { type: 'vec2'; minLength?: number; example: string }
  | { type: 'vec3'; minLength?: number; example: string }
  | { type: 'number_array'; minLength?: number; example: string }
  | { type: 'anglecut'; example: string }
  | { type: 'string_array'; example: string };

const ARRAY_SCHEMAS: Record<string, ArraySchema> = {
  points_poly2: { type: 'vec2', minLength: 3, example: '[[0,0], [1,0], [1,1], ...]' },
  points_line: { type: 'vec3', minLength: 2, example: '[[0,0,0], [1,1,0], ...]' },
  points_poly3: { type: 'vec3', minLength: 4, example: '[[0,0,0], [1,0,0], [1,1,0], [0,1,0]]' },
  height: { type: 'number_array', minLength: 1, example: '[1, 2, ...]' },
  radius: { type: 'number_array', example: '[1, 2]' },
  offset: { type: 'vec3', example: '[1,2,1]' },
  position: { type: 'vec3', example: '[2,2,0]' },
  lookat: { type: 'vec3', example: '[0,0,1]' },
  stretch: { type: 'vec3', example: '[1,2,1]' },
  anglecut: { type: 'anglecut', example: '90 or [45, 90]' },
  flatcut: { type: 'anglecut', example: '90 or [45, 90]' },
  children: { type: 'string_array', example: '["id1", "id2", ...]' },
};

// Centralized array validator
function validate_array(
  value: unknown,
  schema: ArraySchema,
  paramName: string,
  methodName: string,
  isMalformed?: boolean
): string | null {
  // Handle malformed arrays - report expected format
  if (isMalformed) {
    return `Wrong "${paramName}" format: expected like "${schema.example}"`;
  }

  // Handle non-array values for array schemas
  if (!Array.isArray(value)) {
    return `Wrong "${paramName}" format: expected like "${schema.example}"`;
  }

  switch (schema.type) {
    case 'vec2': {
      const dims = 2;
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        return `Wrong "${paramName}" format: expected at least ${schema.minLength} points, got ${value.length}`;
      }
      for (let i = 0; i < value.length; i++) {
        if (!Array.isArray(value[i]) || value[i].length !== dims) {
          return `Wrong "${paramName}" format: expected like "${schema.example}"`;
        }
        for (let j = 0; j < dims; j++) {
          if (typeof value[i][j] !== 'number') {
            return `Wrong "${paramName}" format: expected like "${schema.example}"`;
          }
        }
      }
      return null;
    }

    case 'vec3': {
      const dims = 3;
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        return `Wrong "${paramName}" format: expected at least ${schema.minLength} points, got ${value.length}`;
      }
      for (let i = 0; i < value.length; i++) {
        if (!Array.isArray(value[i]) || value[i].length !== dims) {
          return `Wrong "${paramName}" format: expected like "${schema.example}"`;
        }
        for (let j = 0; j < dims; j++) {
          if (typeof value[i][j] !== 'number') {
            return `Wrong "${paramName}" format: expected like "${schema.example}"`;
          }
        }
      }
      return null;
    }

    case 'number_array': {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        return `Wrong "${paramName}" format: expected like "${schema.example}"`;
      }
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] !== 'number') {
          return `Wrong "${paramName}" format: expected like "${schema.example}"`;
        }
      }
      return null;
    }

    case 'anglecut': {
      // Can be a number or [start, length]
      if (typeof value === 'number') {
        return (value > 0 && value <= 360) ? null : `Wrong "${paramName}" format: expected like "${schema.example}"`;
      }
      if (!Array.isArray(value) || value.length !== 2) {
        return `Wrong "${paramName}" format: expected like "${schema.example}"`;
      }
      if (typeof value[0] !== 'number' || typeof value[1] !== 'number') {
        return `Wrong "${paramName}" format: expected like "${schema.example}"`;
      }
      return (value[1] > 0 && value[1] <= 360) ? null : `Wrong "${paramName}" format: expected like "${schema.example}"`;
    }

    case 'string_array': {
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] !== 'string') {
          return `Wrong "${paramName}" format: expected like "${schema.example}"`;
        }
      }
      return null;
    }

    default:
      return null;
  }
}

// Value type validators
type ValueValidator = (value: unknown, attribute: string, method: string, isMalformed?: boolean) => string | null;

const validate_value: Record<string, ValueValidator> = {
  // String types
  id: (v) => typeof v === "string" ? null : `must be "text" (in quotes)`,
  text: (v) => typeof v === "string" ? null : `must be "text" (in quotes)`,
  title: (v) => typeof v === "string" ? null : `must be "text" (in quotes)`,
  updateFunction: (v) => typeof v === "string" ? null : `must be "text" (in quotes)`,
  createFn: (v) => typeof v === "string" ? null : `must be "text" (in quotes)`,

  // Number types (non-negative)
  radius: (v, _key, method, isMalformed) => {
    // Can be single number (circle/sphere) or array (cylinder)
    if (Array.isArray(v)) {
      // Cylinder: use centralized array validator
      return validate_array(v, ARRAY_SCHEMAS.radius, 'radius', method, isMalformed);
    }
    // Circle/sphere: single number
    if (typeof v !== 'number') return `Invalid "${method}": radius must be a number, got ${typeof v}`;
    if (!isFinite(v)) return `Invalid "${method}": radius must be finite, got ${v}`;
    return v > 0 ? null : `Invalid "${method}": radius must be positive, got ${v}`;
  },
  thickness: (v) => {
    if (typeof v !== "number") return `must be a number, got ${typeof v}`;
    return v >= 0 ? null : `must be non-negative, got ${v}`;
  },
  outline: (v) => {
    if (typeof v !== "number") return `must be a number, got ${typeof v}`;
    return v >= 0 ? null : `must be non-negative, got ${v}`;
  },
  
  // Number types (any)
  spin: (v) => typeof v === "number" ? null : `must be a number, got ${typeof v}`,
  rotation: (v) => typeof v === "number" ? null : `must be a number, got ${typeof v}`, // Deprecated, use spin
  opacity: (v) => {
    if (typeof v !== "number") return `must be a number, got ${typeof v}`;
    return (v >= 0 && v <= 1) ? null : `must be between 0 and 1, got ${v}`;
  },
  size: (v) => typeof v === "number" ? null : `must be a number, got ${typeof v}`,
  segments: (v) => typeof v === "number" ? null : `must be a number, got ${typeof v}`,
  fontSizePx: (v) => typeof v === "number" ? null : `must be a number, got ${typeof v}`,
  length: (v) => typeof v === "number" ? null : `must be a number, got ${typeof v}`,
  tension: (v) => {
    if (typeof v !== "number") return `must be a number, got ${typeof v}`;
    return (v >= 0 && v <= 1) ? null : `must be between 0 and 1, got ${v}`;
  },
  steps: (v) => {
    if (typeof v !== "number") return `must be a number, got ${typeof v}`;
    return v > 0 ? null : `must be positive, got ${v}`;
  },
  tMin: (v) => typeof v === "number" || typeof v === "string" ? null : `must be a number or formula, got ${typeof v}`,
  tMax: (v) => typeof v === "number" || typeof v === "string" ? null : `must be a number or formula, got ${typeof v}`,
  // AngleCut for circle and sphere - [start, length] format, degrees
  anglecut: (v, _key, method, isMalformed) => {
    if (typeof v === 'number') {
      return (v > 0 && v <= 360) ? null : `Wrong "anglecut": must be 0-360, got ${v}`;
    }
    // Use centralized validator for arrays
    return validate_array(v, ARRAY_SCHEMAS.anglecut, 'anglecut', method, isMalformed);
  },

  // flatcut uses same [start, length] format as anglecut
  flatcut: (v, _key, method, isMalformed) => {
    if (typeof v === 'number') {
      return (v > 0 && v <= 360) ? null : `Wrong "flatcut": must be 0-360, got ${v}`;
    }
    // Use centralized validator for arrays
    return validate_array(v, ARRAY_SCHEMAS.flatcut, 'flatcut', method, isMalformed);
  },

  // Vec3 types
  offset: (v, _key, _method, isMalformed) => validate_vec3(v, 'offset', isMalformed),
  position: (v, _key, _method, isMalformed) => validate_vec3(v, 'position', isMalformed),
  target: (v, _key, _method, isMalformed) => validate_vec3(v, 'target', isMalformed),
  stretch: (v, _key, _method, isMalformed) => validate_vec3(v, 'stretch', isMalformed),
  lookat: (v, _key, _method, isMalformed) => validate_vec3(v, 'lookat', isMalformed),

  // Height (number or array of positive numbers for cylinder sections)
  height: (v, _key, method, isMalformed) => {
    if (typeof v === 'number') {
      return v > 0 ? null : `Wrong "height": must be positive, got ${v}`;
    }
    // Use centralized validator for arrays
    return validate_array(v, ARRAY_SCHEMAS.height, 'height', method, isMalformed);
  },

  // Points - method-aware validator
  // poly2: vec2, min 3 points
  // line: vec3, min 2 points
  // poly3: vec3, min 4 points
  points: (v, _key, method, isMalformed) => {
    let schemaKey: string;
    if (method === 'poly2') {
      schemaKey = 'points_poly2';
    } else if (method === 'line') {
      schemaKey = 'points_line';
    } else {
      // poly3 or others default to poly3
      schemaKey = 'points_poly3';
    }
    return validate_array(v, ARRAY_SCHEMAS[schemaKey], 'points', method, isMalformed);
  },

  // Array of strings
  children: (v, _key, method, isMalformed) => {
    return validate_array(v, ARRAY_SCHEMAS.children, 'children', method, isMalformed);
  },

  // Boolean - must be exactly true or false, not truthy/falsy values
  selectable: (v) => v === true || v === false ? null : `must be true or false, got ${JSON.stringify(v)}`,

  // Arrow
  arrow: (v) => {
    if (typeof v !== "string") return `must be a string, got ${typeof v}`;
    const valid = ["none", "end", "start", "both"];
    return valid.includes(v) ? null : `must be "none", "end", "start", or "both", got "${v}"`;
  },

  // Axes range - can be boolean, [min, max] range, or empty array
  // Also accepts string/number for formulas
  x: (v) => {
    if (typeof v === 'boolean') return null;
    if (typeof v === 'string' || typeof v === 'number') return null;
    if (Array.isArray(v)) {
      if (v.length === 0) return null; // Empty array is valid
      if (v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number') return null;
    }
    return null; // Allow any array for now
  },
  y: (v) => {
    if (typeof v === 'boolean') return null;
    if (typeof v === 'string' || typeof v === 'number') return null;
    if (Array.isArray(v)) {
      if (v.length === 0) return null;
      if (v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number') return null;
    }
    return null;
  },
  z: (v) => {
    if (typeof v === 'boolean') return null;
    if (typeof v === 'string' || typeof v === 'number') return null;
    if (Array.isArray(v)) {
      if (v.length === 0) return null;
      if (v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number') return null;
    }
    return null;
  },

  // Color - allow any string (will be parsed later)
  color: (v) => typeof v === "string" ? null : `must be a string, got ${typeof v}`,

  // properties - any value (tooltip displays content as-is, no computation)
  properties: () => null,
};

function validate_vec3(v: unknown, paramName = '', isMalformed?: boolean): string | null {
  // Handle malformed arrays
  if (isMalformed) {
    const example = paramName === 'stretch' ? '[1,2,1]' : paramName === 'position' ? '[2,2,0]' : '[0,0,1]';
    return `Wrong "${paramName}" format: expected like "${example}"`;
  }
  if (!Array.isArray(v)) return `Wrong "${paramName}" format: expected like "${ARRAY_SCHEMAS[paramName]?.example || '[1,2,1]'}"`;
  if (v.length !== 3) return `Wrong "${paramName}" format: expected like "${ARRAY_SCHEMAS[paramName]?.example || '[1,2,1]'}"`;
  for (let i = 0; i < 3; i++) {
    if (typeof v[i] !== 'number') {
      return `Wrong "${paramName}" format: expected like "${ARRAY_SCHEMAS[paramName]?.example || '[1,2,1]'}"`;
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

function get_line_number(code: string, position: number): number {
  let line = 1;
  for (let i = 0; i < position && i < code.length; i++) {
    if (code[i] === "\n") line++;
  }
  return line;
}

function extract_line_from_error_msg(msg: string): number | undefined {
  const match = msg.match(/(?:line\s*)(\d+)/i) || msg.match(/(\d+):/);
  if (match) {
    const line = parseInt(match[1], 10);
    if (!isNaN(line)) return line;
  }
  return undefined;
}

function make_error_friendly(msg: string): string {
  const overrides: Record<string, string> = {
    "Right side of assignment cannot be destructured": "Missing () at the end",
    "Unterminated string literal": "Missing closing quote",
    "Unexpected EOF": "Code cut off, check brackets and quotes",
    "Can't find variable:": "not found, check spelling",
    "Cannot read properties of undefined": "Not found, check spelling",
    "Bare private name can only be used as the left-hand side of an `in` expression": "Color must be like \"#ff0000\" (in quotes)",
  };

  for (const [pattern, friendly] of Object.entries(overrides)) {
    if (msg.includes(pattern)) {
      if (pattern === "Can't find variable:") {
        const match = msg.match(/Can't find variable:\s*(\S+)/);
        if (match) {
          const param = match[1];
          return `Missing value for "${param}", expected "${param}: value"`;
        }
      }
      if (pattern === "Cannot read properties of undefined") {
        const match = msg.match(/reading\s*'([^']+)'/);
        if (match) {
          return `'${match[1]}' ${friendly}`;
        }
      }
      return friendly;
    }
  }
  return msg;
}

function format_error_message(msg: string, line: number | undefined): string {
  const friendly = make_error_friendly(msg);
  const prefix = line ? `(Line ${line}) ` : "";
  return `${prefix}${friendly}`;
}

export function validate_scene_code(scene_code: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Strip comments before validation
  const code = strip_comments(scene_code);

  // 1. Syntax validation
  try {
    new Function("scene", code);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const line = extract_line_from_error_msg(msg);
    errors.push({
      type: "syntax",
      message: format_error_message(msg, line),
      line,
    });
  }

  // If syntax invalid, we can't reliably parse further - but still try for better errors
  const syntax_valid = errors.length === 0;

  // 2. API method validation - check all scene.X patterns for validity and syntax
  if (syntax_valid) {
    const method_regex = /scene\.(\w+)/g;
    const seen_methods = new Set<string>();
    let match;
    while ((match = method_regex.exec(code)) !== null) {
      const method = match[1];
      
      if (seen_methods.has(method)) continue;
      seen_methods.add(method);
      
      // Check if method is valid
      const is_valid_method = VALID_METHODS.has(method);
      
      if (!is_valid_method) {
        const line = get_line_number(code, match.index);
        errors.push({
          type: "method",
          message: `(Line ${line}) Unknown method: "${method}"`,
          line,
        });
        continue;
      }

      // Check if method is called with parentheses (e.g., scene.circle vs scene.circle())
      // Only valid if followed by (
      const after_method = code.slice(match.index + match[0].length);
      if (!/^\s*\(/.test(after_method)) {
        const line = get_line_number(code, match.index);
        errors.push({
          type: "syntax",
          message: `(Line ${line}) Missing parenthesis: "scene.${method}()"`,
          line,
        });
        continue;
      }

      // Methods that don't require an object parameter (can take a number or other directly)
      const methods_taking_number = new Set(['grid', 'smoothness', 'getObject', 'listObjects']);
      if (!methods_taking_number.has(method)) {
        // Check if method has at least empty object parameter {}
        // scene.circle() without {} will fail at runtime with destructuring error
        const after_paren = after_method.replace(/^\s*\(\s*/, '');
        if (!/^\s*\{/.test(after_paren)) {
          const line = get_line_number(code, match.index);
          errors.push({
            type: "syntax",
            message: `(Line ${line}) Missing parameters inside "${method}({...})"`,
            line,
          });
        }
      }
    }
  }

  // 3. Attribute validation (find all unknown attributes)
  if (syntax_valid) {
    const method_call_regex = /scene\.(\w+)\s*\(/g;
    let match;
    while ((match = method_call_regex.exec(code)) !== null) {
      const method = match[1];
      if (!VALID_METHODS.has(method)) continue;

      const call_start = match.index + match[0].length;
      const code_after_paren = code.slice(call_start);
      if (!code_after_paren.trim().startsWith("{")) continue;

      const allowed = VALID_PARAMETERS[method];
      if (!allowed) continue;

      const top_level_keys = extract_top_level_keys(code, call_start);
      for (const { key, position } of top_level_keys) {
        if (!allowed.has(key)) {
          const line = get_line_number(code, position);
          errors.push({
            type: "parameter",
            message: `(Line ${line}) Unknown parameter "${key}" in ${method}`,
            line,
          });
        }
      }
    }
  }

  // 4. Value format validation
  if (syntax_valid) {
    const method_call_regex = /scene\.(\w+)\s*\(/g;
    let match;
    while ((match = method_call_regex.exec(code)) !== null) {
      const method = match[1];
      if (!VALID_METHODS.has(method)) continue;

      const call_start = match.index + match[0].length;
      const code_after_paren = code.slice(call_start);
      if (!code_after_paren.trim().startsWith("{")) continue;

      const allowed = VALID_PARAMETERS[method];
      if (!allowed) continue;

      const attributes = extract_attribute_values(code, call_start);
      for (const { key, value, position, isMalformed } of attributes) {
        if (!allowed.has(key)) continue; // Skip unknown attributes (already reported)
        
        const validator = validate_value[key];
        if (validator) {
          const error = validator(value, key, method, isMalformed);
          if (error) {
            const line = get_line_number(code, position);
            errors.push({
              type: "value",
              message: `(Line ${line}) ${error}`,
              line,
            });
          }
        }

      // Custom validation for cylinder: validate height/radius consistency
      // Only applies when both are arrays - single numbers are always valid
      if (method === "cylinder") {
        const height_attr = attributes.find(a => a.key === "height");
        const radius_attr = attributes.find(a => a.key === "radius");

        const height_is_array = height_attr && Array.isArray(height_attr.value);
        const radius_is_array = radius_attr && Array.isArray(radius_attr.value);

        // Only validate when both are arrays
        if (height_is_array && radius_is_array) {
          const height_len = (height_attr.value as unknown[]).length;
          const radius_len = (radius_attr.value as unknown[]).length;

          if (radius_len !== height_len + 1) {
            errors.push({
              type: "value",
              message: `Invalid "radius" in "cylinder": expected 1 more radius than height sections`,
            });
          }
        } else if (!height_is_array && radius_is_array) {
          // No height array but radius is array - need at least 2 radius values
          const radius_len = (radius_attr.value as unknown[]).length;
          if (radius_len < 2) {
            errors.push({
              type: "value",
              message: `Invalid "radius" in "cylinder": expected at least 2 values`,
            });
          }
        }
        // Single number height + single number radius: always valid
      }
    }
  }
  }

  // 5. Runtime execution check - catches errors like undefined variables (yes vs true)
  if (syntax_valid && errors.length === 0) {
    try {
      // Create a mock scene API that tracks calls
      const mockScene: Record<string, unknown> = {};
      for (const method of VALID_METHODS) {
        mockScene[method] = () => {}; // No-op for all methods
      }
      
      // Try to execute - this will catch runtime errors like "can't find variable: yes"
      const fn = new Function("scene", code);
      fn(mockScene);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const line = extract_line_from_error_msg(msg);
      errors.push({
        type: "runtime",
        message: format_error_message(msg, line),
        line,
      });
    }
  }

  // 6. Performance warnings
  const perf_warnings = check_performance_budget(code);
  warnings.push(...perf_warnings);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function extract_attribute_values(code: string, start_pos: number): Array<{ key: string; value: unknown; position: number; isMalformed?: boolean }> {
  const result: Array<{ key: string; value: unknown; position: number; isMalformed?: boolean }> = [];
  
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
  
  const originalObjCode = code.slice(objStart, objEnd + 1);

  // Helper function to extract complete value considering brackets
  const extractCompleteValue = (startPos: number): string => {
    let i = startPos;
    // Skip whitespace
    while (i < originalObjCode.length && /\s/.test(originalObjCode[i])) i++;

    const startChar = originalObjCode[i];

    // Handle arrays and objects - count brackets to find complete value
    if (startChar === '[' || startChar === '{') {
      let depth = 0;
      let inString = false;
      let stringChar = '';
      let escaped = false;

      for (; i < originalObjCode.length; i++) {
        const char = originalObjCode[i];

        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          continue;
        }

        if (inString) {
          if (char === stringChar) {
            inString = false;
          }
          continue;
        }

        if (char === '"' || char === "'" || char === '`') {
          inString = true;
          stringChar = char;
          continue;
        }

        if (char === startChar) {
          depth++;
        } else if ((startChar === '[' && char === ']') || (startChar === '{' && char === '}')) {
          depth--;
          if (depth === 0) {
            i++; // Include the closing bracket
            break;
          }
        }
      }
      return originalObjCode.slice(startPos, i);
    }

    // Handle simple values (numbers, strings, identifiers) - take until , or }
    let end = startPos;
    while (end < originalObjCode.length && !/[,\n}]/.test(originalObjCode[end])) {
      end++;
    }
    return originalObjCode.slice(startPos, end).trim();
  };

  // Find all keys and extract their values using bracket-aware extraction
  const keyValueRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
  let kvMatch;

  while ((kvMatch = keyValueRegex.exec(originalObjCode)) !== null) {
    const key = kvMatch[1];
    const colonPos = kvMatch.index + kvMatch[0].length;
    const valueStr = extractCompleteValue(colonPos);
    const position = objStart + kvMatch.index;

    // Skip empty values
    if (!valueStr || valueStr === '[' || valueStr === '{') continue;

    // Try to parse the value
    let value: unknown;
    try {
      value = JSON.parse(valueStr);
    } catch {
      // If JSON parse fails, mark as malformed so validators can report proper errors
      result.push({ key, value: valueStr, position, isMalformed: true });
      continue;
    }

    result.push({ key, value, position });
  }

  return result;
}

function extract_top_level_keys(code: string, start_pos: number): Array<{ key: string; position: number }> {
  const keys: Array<{ key: string; position: number }> = [];
  
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
        keys.push({ key: code.slice(keyStart, i).trim(), position: keyStart });
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

  const label_regex = /scene\.label\s*\(/g;
  const label_count = [...scene_code.matchAll(label_regex)].length;
  if (label_count > PERFORMANCE_LIMITS.max_labels) {
    warnings.push(`Scene has ${label_count} labels (limit: ${PERFORMANCE_LIMITS.max_labels})`);
  }

  const animation_regex = /scene\.animation\s*\(/g;
  const animation_count = [...scene_code.matchAll(animation_regex)].length;
  if (animation_count > PERFORMANCE_LIMITS.max_animations) {
    warnings.push(`Scene has ${animation_count} animations (limit: ${PERFORMANCE_LIMITS.max_animations})`);
  }

  let estimated_polygons = 0;

  const sphere_regex = /scene\.sphere\s*\(/g;
  const sphere_count = [...scene_code.matchAll(sphere_regex)].length;
  estimated_polygons += sphere_count * 1000;

  const cylinder_regex = /scene\.cylinder\s*\(/g;
  const cylinder_count = [...scene_code.matchAll(cylinder_regex)].length;
  estimated_polygons += cylinder_count * 100;

  const poly3_count = (scene_code.match(/scene\.poly3\s*\(\s*\{[^}]*points\s*:\s*\[/g) || []).length;
  estimated_polygons += poly3_count * 100;

  if (estimated_polygons > PERFORMANCE_LIMITS.max_polygons) {
    warnings.push(`Scene may exceed polygon budget (${estimated_polygons.toLocaleString()} estimated, limit: ${PERFORMANCE_LIMITS.max_polygons.toLocaleString()})`);
  }

  return warnings;
}

export function snap_to_grid(value: number, grid_size: number): number {
  return Math.round(value / grid_size) * grid_size;
}

export function validate_scene(scene: SavedScene): ValidationResult {
  return validate_scene_code(get_scene_code(scene));
}

export function validate_llm_response(code: string): ValidationResult {
  if (!code || typeof code !== "string") {
    return {
      ok: false,
      errors: [{ type: "syntax", message: "Missing scene code" }],
      warnings: [],
    };
  }

  return validate_scene_code(code);
}
