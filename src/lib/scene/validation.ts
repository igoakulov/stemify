import { get_scene_code, type SavedScene } from "@/lib/scene/store";

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
const ALLOWED_METHODS = new Set([
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
  poly3: new Set(["id", "points", "offset", "color", "opacity", "lookat", "spin", "selectable"]),
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
    // Can be single number (circle/sphere) or array (cylinder)
    if (Array.isArray(v)) {
      // Cylinder: array of radii
      for (let i = 0; i < v.length; i++) {
        if (typeof v[i] !== "number") return `radius[${i}] must be a number, got ${typeof v[i]}`;
        if (v[i] < 0) return `radius[${i}] must be non-negative, got ${v[i]}`;
      }
      return null;
    }
    // Circle/sphere: single number
    if (typeof v !== "number") return `must be a number, got ${typeof v}`;
    if (!isFinite(v)) return `must be finite, got ${v}`;
    return v > 0 ? null : `must be positive, got ${v}`;
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
  tMin: (v) => typeof v === "number" ? null : `must be a number, got ${typeof v}`,
  tMax: (v) => typeof v === "number" ? null : `must be a number, got ${typeof v}`,
  // AngleCut for circle and sphere - [start, length] format, degrees
  anglecut: (v) => {
    if (typeof v === "number") {
      return (v > 0 && v <= 360) ? null : `must be 0-360, got ${v}`;
    }
    if (Array.isArray(v)) {
      if (v.length !== 2) {
        return `must be number or [start, length]`;
      }
      const [start, length] = v;
      if (typeof start !== "number" || typeof length !== "number") {
        return `both values must be numbers`;
      }
      return (length > 0 && length <= 360) ? null : `length must be 0-360, got ${length}`;
    }
    return `must be number or [start, length]`;
  },

  // flatcut uses same [start, length] format as anglecut
  flatcut: (v) => {
    if (typeof v === "number") {
      return (v > 0 && v <= 360) ? null : `must be 0-360, got ${v}`;
    }
    if (Array.isArray(v)) {
      if (v.length !== 2) {
        return `must be number or [start, length]`;
      }
      const [start, length] = v;
      if (typeof start !== "number" || typeof length !== "number") {
        return `both values must be numbers`;
      }
      return (length > 0 && length <= 360) ? null : `length must be 0-360, got ${length}`;
    }
    return `must be number or [start, length]`;
  },

  // Vec3 types
  offset: (v) => validate_vec3(v),
  shift: (v) => validate_vec3(v),
  position: (v) => validate_vec3(v),
  target: (v) => validate_vec3(v),
  stretch: (v) => validate_vec3(v),
  lookat: (v) => validate_vec3(v),

  // Height (number or array of positive numbers for cylinder sections)
  height: (v) => {
    if (typeof v === "number") {
      return v > 0 ? null : `must be positive, got ${v}`;
    }
    if (!Array.isArray(v)) return `must be a number or array, got ${typeof v}`;
    if (v.length < 1) return `must have at least 1 section`;
    for (let i = 0; i < v.length; i++) {
      if (typeof v[i] !== "number") return `height[${i}] must be a number, got ${typeof v[i]}`;
      if (v[i] <= 0) return `height[${i}] must be positive, got ${v[i]}`;
    }
    return null;
  },

  // Points - method-aware validator
  // Default: Vec3 [x,y,z], min 3 points (line, curve, poly3)
  // poly2: Vec2 [x,y], min 3 points
  points: (v, _key, method) => {
    const isPoly2 = method === "poly2";
    const dims = isPoly2 ? 2 : 3;
    const minPoints = 3;
    const example = isPoly2 ? "[[0,0], [1,1], [2,0]]" : "[[0,0,0], [1,0,0], [1,1,0]]";
    const pointExample = "[x, y]";

    if (!Array.isArray(v)) return `must be like ${example}`;
    if (v.length < minPoints) return `must have at least ${minPoints} points`;
    for (let i = 0; i < v.length; i++) {
      if (!Array.isArray(v[i]) || v[i].length !== dims) {
        return `point ${i} must be ${pointExample}`;
      }
      for (let j = 0; j < dims; j++) {
        if (typeof v[i][j] !== "number") {
          return `point ${i} must be numbers`;
        }
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

  // Arrow
  arrow: (v) => {
    if (typeof v !== "string") return `must be a string, got ${typeof v}`;
    const valid = ["none", "end", "start", "both"];
    return valid.includes(v) ? null : `must be "none", "end", "start", or "both", got "${v}"`;
  },

  // Axes booleans - must be exactly true or false
  // Formula x,y,z - must be string or number (for addFormula method)
  x: (v) => {
    if (typeof v === "boolean") return null;
    if (typeof v === "string" || typeof v === "number") return null;
    return `must be true/false or a formula/number, got ${typeof v}`;
  },
  y: (v) => {
    if (typeof v === "boolean") return null;
    if (typeof v === "string" || typeof v === "number") return null;
    return `must be true/false or a formula/number, got ${typeof v}`;
  },
  z: (v) => {
    if (typeof v === "boolean") return null;
    if (typeof v === "string" || typeof v === "number") return null;
    return `must be true/false or a formula/number, got ${typeof v}`;
  },

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
          return `'${match[1]}' ${friendly}`;
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

function is_inside_comment(code: string, position: number): boolean {
  let in_string = false;
  let string_char = "";
  let in_block_comment = false;
  let in_line_comment = false;

  for (let i = 0; i < position; i++) {
    const char = code[i];

    if (in_string) {
      if (char === "\\") {
        i++;
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
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      in_string = true;
      string_char = char;
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
  }

  return in_line_comment || in_block_comment;
}

export function validate_scene_code(scene_code: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // 1. Syntax validation
  try {
    new Function("scene", scene_code);
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
    while ((match = method_regex.exec(scene_code)) !== null) {
      if (is_inside_comment(scene_code, match.index)) continue;

      const method = match[1];
      
      if (seen_methods.has(method)) continue;
      seen_methods.add(method);
      
      // Check if method is valid
      const is_valid_method = ALLOWED_METHODS.has(method);
      
      if (!is_valid_method) {
        const line = get_line_number(scene_code, match.index);
        errors.push({
          type: "method",
          message: `(Line ${line}) Unknown method: "${method}"`,
          line,
        });
        continue;
      }

      // Check if method is called with parentheses (e.g., scene.circle vs scene.circle())
      // Only valid if followed by (
      const after_method = scene_code.slice(match.index + match[0].length);
      if (!/^\s*\(/.test(after_method)) {
        const line = get_line_number(scene_code, match.index);
        errors.push({
          type: "syntax",
          message: `(Line ${line}) Missing parenthesis: "scene.${method}()"`,
          line,
        });
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

      const allowed = VALID_PARAMETERS[method];
      if (!allowed) continue;

      const top_level_keys = extract_top_level_keys(scene_code, call_start);
      for (const { key, position } of top_level_keys) {
        if (!allowed.has(key)) {
          const line = get_line_number(scene_code, position);
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
    while ((match = method_call_regex.exec(scene_code)) !== null) {
      const method = match[1];
      if (!ALLOWED_METHODS.has(method)) continue;

      const call_start = match.index + match[0].length;
      const code_after_paren = scene_code.slice(call_start);
      if (!code_after_paren.trim().startsWith("{")) continue;

      const allowed = VALID_PARAMETERS[method];
      if (!allowed) continue;

      const attributes = extract_attribute_values(scene_code, call_start);
      for (const { key, value, position } of attributes) {
        if (!allowed.has(key)) continue; // Skip unknown attributes (already reported)
        
        const validator = validate_value[key];
        if (validator) {
          const error = validator(value, key, method);
          if (error) {
            const line = get_line_number(scene_code, position);
            errors.push({
              type: "value",
              message: `(Line ${line}) Invalid value for "${key}" in ${method}: ${error}`,
              line,
            });
        }
      }

      // Custom validation for cylinder: validate height/radius consistency
      if (method === "cylinder") {
        const height_attr = attributes.find(a => a.key === "height");
        const radius_attr = attributes.find(a => a.key === "radius");

        // height can be number or array - get effective height length
        let height_len: number | null = null;
        if (height_attr) {
          if (typeof height_attr.value === "number") {
            height_len = 1;
          } else if (Array.isArray(height_attr.value)) {
            height_len = height_attr.value.length;
          }
        }

        const radius_len = radius_attr && Array.isArray(radius_attr.value) ? radius_attr.value.length : null;

        // If both provided, validate they match
        if (height_len !== null && radius_len !== null) {
          if (radius_len !== height_len + 1) {
            errors.push({
              type: "value",
              message: `Invalid "radius" in cylinder: must have ${height_len + 1} values (height.length + 1), got ${radius_len}`,
            });
          }
        }

        // If only radius provided (no height), validate radius has at least 2 values
        if (height_len === null && radius_len !== null && radius_len < 2) {
          errors.push({
            type: "value",
            message: `Invalid "radius" in cylinder: must have at least 2 values to infer height`,
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
      const line = extract_line_from_error_msg(msg);
      errors.push({
        type: "runtime",
        message: format_error_message(msg, line),
        line,
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

function extract_attribute_values(code: string, start_pos: number): Array<{ key: string; value: unknown; position: number }> {
  const result: Array<{ key: string; value: unknown; position: number }> = [];
  
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
  let objCode = originalObjCode;
  
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
  
  // Helper to extract value from original code at a given position
  const extractValueFromOriginal = (afterColonPos: number): string => {
    // Skip whitespace after colon
    let i = afterColonPos;
    while (i < originalObjCode.length && /\s/.test(originalObjCode[i])) i++;
    
    const startChar = originalObjCode[i];
    
    // Handle string literals
    if (startChar === '"' || startChar === "'" || startChar === "`") {
      let end = i + 1;
      while (end < originalObjCode.length) {
        if (originalObjCode[end] === "\\") {
          end += 2; // Skip escape sequence
          continue;
        }
        if (originalObjCode[end] === startChar) {
          end++; // Include closing quote
          break;
        }
        end++;
      }
      return originalObjCode.slice(i, end);
    }
    
    // Handle arrays and objects
    if (startChar === "[" || startChar === "{") {
      const openChar = startChar;
      const closeChar = startChar === "[" ? "]" : "}";
      let depth = 1;
      let end = i + 1;
      let inString = false;
      let stringChar = "";
      
      while (end < originalObjCode.length && depth > 0) {
        const c = originalObjCode[end];
        if (!inString) {
          if (c === '"' || c === "'" || c === "`") {
            inString = true;
            stringChar = c;
          } else if (c === openChar) {
            depth++;
          } else if (c === closeChar) {
            depth--;
          }
        } else {
          if (c === "\\") {
            end++; // Skip next char
          } else if (c === stringChar) {
            inString = false;
          }
        }
        end++;
      }
      return originalObjCode.slice(i, end);
    }
    
    // Handle simple values (numbers, booleans, identifiers)
    let end = i;
    while (end < originalObjCode.length && !/[,\n}]/.test(originalObjCode[end])) {
      end++;
    }
    return originalObjCode.slice(i, end).trim();
  };
  
  // Use a simpler regex approach - find all key: value pairs
  // Match: key: value with support for nested arrays/objects
  const kvRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^\n,}]+)/g;
  let match;
  
  while ((match = kvRegex.exec(objCode)) !== null) {
    const key = match[1];
    const placeholderValue = match[2].trim();
    
    // Skip empty values
    if (!placeholderValue) continue;
    
    // Skip if this is a placeholder from string replacement
    if (placeholderValue === '"__STRING__"') {
      // Extract actual value from originalObjCode
      const keyPattern = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`);
      const origMatch = originalObjCode.match(keyPattern);
      if (origMatch && origMatch.index !== undefined) {
        const colonPos = originalObjCode.indexOf(':', origMatch.index);
        const actualValueStr = extractValueFromOriginal(colonPos + 1);
        const position = objStart + origMatch.index;
        
        // Parse the actual string value
        let value: unknown;
        try {
          value = JSON.parse(actualValueStr);
        } catch {
          // For single quotes or backticks, extract content directly
          if ((actualValueStr.startsWith("'") && actualValueStr.endsWith("'")) ||
              (actualValueStr.startsWith("`") && actualValueStr.endsWith("`"))) {
            value = actualValueStr.slice(1, -1);
          } else {
            continue;
          }
        }
        result.push({ key, value, position });
      }
      continue;
    }
    
    // Find the key position in the original code
    const keyPattern = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`);
    const origMatch = originalObjCode.match(keyPattern);
    const position = origMatch ? objStart + origMatch.index! : objStart;
    
    // Try to parse the value
    let value: unknown;
    try {
      value = JSON.parse(placeholderValue);
    } catch {
      // If JSON parse fails, it might be a bare identifier or expression
      // Try to handle common cases
      if (placeholderValue === "true") value = true;
      else if (placeholderValue === "false") value = false;
      else if (placeholderValue === "null") value = null;
      else if (!isNaN(Number(placeholderValue))) value = Number(placeholderValue);
      else if ((placeholderValue.startsWith('"') && placeholderValue.endsWith('"')) || 
               (placeholderValue.startsWith("'") && placeholderValue.endsWith("'"))) {
        // Extract string literal content for validation
        value = placeholderValue.slice(1, -1);
      } else {
        continue; // Skip truly unparseable values (expressions, etc.)
      }
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
