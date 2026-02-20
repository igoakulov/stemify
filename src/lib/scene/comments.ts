type CommentDictionary = Record<string, Record<string, string>>;

const COMMENTS: CommentDictionary = {
  addPoint: {
    center: "// Position: [x, y, z]. Omit for origin [0, 0, 0]",
    shift: "// Offset from center: [dx, dy, dz] for temporary adjustments",
    color: "// Hex color: #RRGGBB or rgba(255,0,0,1) or hsl(0,100%,50%)",
    selectable: "// true=can click to inspect, false=cannot",
  },
  addLine: {
    points: "// Array of [x,y,z] points: [[0,0,0], [1,1,1]] or formula expression",
    shift: "// Offset all points: [dx, dy, dz]",
    thickness: "// Line width. 0=thin line, >0=tube",
    arrow: '// Arrow heads: "none" / "start" / "end" / "both"',
    color: "// Hex color or rgba() or hsl()",
    opacity: "// 1=opaque, 0=transparent, 0.5=semi-transparent",
  },
  addPoly2D: {
    points: "// Corners as [[x,y,z], [x,y,z], ...]. 3=triangle, 4=rectangle, 5+=polygon",
    shift: "// Offset all points: [dx, dy, dz]",
    color: "// Hex color or rgba() or hsl()",
    opacity: "// 1=solid fill, 0=outline only, 0.5=semi-transparent",
    direction: "// Face direction: [0, 0, 1] = facing +Z axis",
    rotation: "// Spin around direction axis: degrees. 180=flipped",
  },
  addCircle: {
    center: "// Position: [x, y, z]. Omit for origin",
    shift: "// Offset from center: [dx, dy, dz]",
    radius: "// Circle size",
    stretch: "// Make oval: [2, 1, 1]=stretched 2x in X",
    anglecut: "// Cut arc: [0, 180]=half, [0, 90]=quarter, [0, 360]=full. 0° = +X",
    direction: "// Face direction: [0, 1, 0] = facing up (+Y)",
    rotation: "// Spin around direction: degrees",
    color: "// Hex color or rgba() or hsl()",
    opacity: "// 1=solid, 0=outline, 0.5=transparent",
  },
  addSphere: {
    center: "// Position: [x, y, z]. Omit for origin",
    shift: "// Offset from center: [dx, dy, dz]",
    radius: "// Sphere size",
    stretch: "// Make oval: [2, 1, 1]=stretched 2x in X",
    anglecut: "// Horizontal cut: [0, 180]=half, [0, 90]=quarter. 0° = +X",
    flatcut: "// Vertical cut: [0, 180]=half sphere, [0, 90]=quarter. 0° = top",
    direction: "// Face direction: [0, 0, 1] = facing +Z",
    rotation: "// Spin around direction: degrees",
    color: "// Hex color or rgba() or hsl()",
    opacity: "// 1=opaque, 0=transparent, 0.5=semi-transparent",
  },
  addCylinder: {
    points: "// End points: [[x,y,z], [x,y,z]]. 2=straight, 3+=curved",
    shift: "// Offset all points: [dx, dy, dz]",
    radius: "// Width at each point: [2, 2]=cylinder, [2, 0]=cone",
    anglecut: "// Cut cross-section: [0, 360]=full, [0, 180]=half. 0° = +X",
    direction: "// Face direction: [0, 0, 1] = facing +Z",
    rotation: "// Spin around direction: degrees",
    color: "// Hex color or rgba() or hsl()",
    opacity: "// 1=opaque, 0=transparent, 0.5=semi-transparent",
  },
  addPoly3D: {
    points: "// Corners: [[x,y,z], ...]. Order matters - connects in order",
    shift: "// Offset all points: [dx, dy, dz]",
    color: "// Hex color or rgba() or hsl()",
    opacity: "// 1=solid, 0=wireframe, 0.5=transparent",
    direction: "// Face direction: [0, 0, 1] = facing +Z",
    rotation: "// Spin around direction: degrees",
  },
  addDonut: {
    center: "// Position: [x, y, z]. Omit for origin",
    shift: "// Offset from center: [dx, dy, dz]",
    radius: "// Donut ring radius (center to tube center)",
    thickness: "// Tube thickness",
    anglecut: "// Cut arc: [0, 360]=full ring, [0, 180]=half ring. 0° = +X",
    direction: "// Face direction: [0, 0, 1] = flat on XY plane",
    rotation: "// Spin around direction: degrees",
    color: "// Hex color or rgba() or hsl()",
    opacity: "// 1=opaque, 0=transparent, 0.5=semi-transparent",
  },
  addAxes: {
    x: "// X-axis range: [start, end]. Omit axis to hide it",
    y: "// Y-axis range: [start, end]. Omit axis to hide it", 
    z: "// Z-axis range: [start, end]. Omit axis to hide it",
    length: "// Length if not specifying ranges",
    position: "// Origin point: [x, y, z]. Default [0, 0, 0]",
    selectable: "// true=can click, false=cannot",
  },
  addLabel: {
    text: "// Text to display. Use $...$ for math: $x^2$ = x squared",
    position: "// Position: [x, y, z]",
    color: "// Text color: hex, rgba(), or hsl()",
    fontSizePx: "// Text size in pixels: 12-24",
    selectable: "// true=can click to inspect, false=cannot",
  },
  addGroup: {
    children: "// IDs of objects to group: ['obj1', 'obj2']",
    shift: "// Move entire group: [dx, dy, dz]",
    direction: "// Turn to face: [0, 0, 1] = facing +Z",
    rotation: "// Spin around direction: degrees",
    selectable: "// true=can click to inspect group, false=cannot",
  },
  addTooltip: {
    title: "// Title shown when selecting object",
    properties:
      '// Structured info: [{ label: "Mass", value: "5kg" }, { label: "Speed", value: "10m/s" }]',
  },
  addAnimation: {
    updateFunction:
      '// JavaScript code running every frame (~60/sec). Use "elapsed" for seconds. Example: obj.rotation.y = elapsed;',
  },
  addCustomMesh: {
    createFn: "// Custom Three.js code. Return a THREE.Mesh",
    center: "// Position: [x, y, z]. Omit for origin",
    shift: "// Offset from center: [dx, dy, dz]",
    color: "// Mesh color if material supports it",
    direction: "// Face direction: [0, 0, 1] = facing +Z",
    rotation: "// Spin around direction: degrees",
    selectable: "// true=can click to inspect, false=cannot",
  },
};

const GLOBAL_COMMENTS: Record<string, string> = {
  id: '// Unique name: "wheel", "pendulum", "house_roof"',
  opacity: "// 1=opaque, 0=transparent, 0.5=semi-transparent",
  shift: "// Offset: [dx, dy, dz]. Stacks with center/points",
  direction: "// Face direction: [0, 0, 1] = facing +Z axis",
  rotation: "// Spin degrees around direction axis. 180=flipped",
  selectable: "// true=can click to inspect/edit code, false=cannot",
};

const SCENE_INTRO = `// Welcome to your STEMify scene code

// Coordinate format: [x, y, z] - always array of 3 numbers
// Example: center: [1, 2, 3], points: [[0,0,0], [1,1,1]]
// 
// Quick reference:
// - [0, 0, 0] = origin
// - Omit parameter = use default (usually origin or no effect)
// - shift: [dx, dy, dz] = adds to position temporarily
// - direction: [0, 0, 1] = facing positive Z direction
// - rotation: degrees around direction axis
//
// Stay under 50 objects / 100k polygons for performance
`;

export function inject_comments(code: string, method?: string): string {
  // Prepend intro for full scene code (when method is not specified)
  const intro = method === undefined ? SCENE_INTRO + "\n" : "";

  const lines = code.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    result.push(line);

    const trimmed = line.trim();
    if (!trimmed.startsWith("//")) {
      const match = trimmed.match(/^(\w+):/);
      if (match) {
        const key = match[1];
        let comment: string | undefined;

        if (GLOBAL_COMMENTS[key]) {
          comment = GLOBAL_COMMENTS[key];
        }

        if (method && COMMENTS[method]?.[key]) {
          comment = COMMENTS[method][key];
        }

        if (comment) {
          result.push(`  ${comment}`);
        }
      }
    }
  }

  return intro + result.join("\n");
}

export function get_scene_intro(): string {
  return SCENE_INTRO;
}

export function inject_comments_for_method(
  code: string,
  method: string,
): string {
  return inject_comments(code, method);
}

export function remove_comments(code: string): string {
  const lines = code.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip lines that are comments (start with // or /* or are just * for block comments)
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      trimmed === "*/"
    ) {
      continue;
    }

    // Skip empty lines
    if (trimmed === "") {
      continue;
    }

    result.push(line);
  }

  return result.join("\n");
}

/**
 * Formats single-line scene object calls into multi-line format
 * Example: scene.addLabel({ id: "x", text: "y" })
 * Becomes:
 * scene.addLabel({
 *   id: "x",
 *   text: "y"
 * })
 */
function format_single_line_object(code: string): string {
  // Check if it's a scene method call on a single line
  const methodPattern = /^(\s*)(scene\.\w+)\s*\(\s*\{/;
  const methodMatch = code.match(methodPattern);

  if (!methodMatch) {
    return code;
  }

  const [, indent, methodCall] = methodMatch;

  // Find the content between the first { and its matching }
  const openParenIndex = code.indexOf("(");
  const openBraceIndex = code.indexOf("{", openParenIndex);

  if (openBraceIndex === -1) {
    return code;
  }

  // Find the matching closing brace by counting
  let braceDepth = 1;
  let closeBraceIndex = -1;
  let inString = false;
  let stringChar = "";

  for (let i = openBraceIndex + 1; i < code.length; i++) {
    const char = code[i];
    const prevChar = i > 0 ? code[i - 1] : "";

    // Handle string literals
    if (!inString && (char === '"' || char === "'" || char === "`")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== "\\") {
      inString = false;
    } else if (!inString) {
      if (char === "{") {
        braceDepth++;
      } else if (char === "}") {
        braceDepth--;
        if (braceDepth === 0) {
          closeBraceIndex = i;
          break;
        }
      }
    }
  }

  if (closeBraceIndex === -1) {
    return code;
  }

  // Check if it's single line (no newlines in the object content)
  const propsContent = code.slice(openBraceIndex + 1, closeBraceIndex);
  if (propsContent.includes("\n")) {
    // Already multi-line, don't reformat
    return code;
  }

  // Check for semicolon after closing paren
  const afterBrace = code.slice(closeBraceIndex + 1).trim();
  const semicolon = afterBrace.startsWith(");") ? ";" : "";

  // Split properties at commas, respecting nested braces
  const props: string[] = [];
  let currentProp = "";
  let propBraceDepth = 0;
  let propInString = false;
  let propStringChar = "";

  for (let i = 0; i < propsContent.length; i++) {
    const char = propsContent[i];
    const prevChar = i > 0 ? propsContent[i - 1] : "";

    // Handle string literals
    if (!propInString && (char === '"' || char === "'" || char === "`")) {
      propInString = true;
      propStringChar = char;
      currentProp += char;
    } else if (propInString && char === propStringChar && prevChar !== "\\") {
      propInString = false;
      currentProp += char;
    } else if (!propInString) {
      if (char === "{") {
        propBraceDepth++;
        currentProp += char;
      } else if (char === "}") {
        propBraceDepth--;
        currentProp += char;
      } else if (char === "," && propBraceDepth === 0) {
        const trimmed = currentProp.trim();
        if (trimmed) {
          props.push(trimmed);
        }
        currentProp = "";
      } else {
        currentProp += char;
      }
    } else {
      currentProp += char;
    }
  }

  // Add the last property
  const trimmed = currentProp.trim();
  if (trimmed) {
    props.push(trimmed);
  }

  if (props.length <= 1) {
    // No need to format if 0 or 1 properties
    return code;
  }

  // Build multi-line output
  const propIndent = indent + "  ";
  const formattedProps = props.map((p) => `${propIndent}${p},`).join("\n");

  return `${indent}${methodCall}({\n${formattedProps}\n${indent}})${semicolon}`;
}

/**
 * Pretty-prints scene code by formatting single-line calls and adding comments
 */
export function pretty_print_scene_code(code: string, method?: string): string {
  // First, format any single-line object calls
  const lines = code.split("\n");
  const formattedLines = lines.map((line) => format_single_line_object(line));
  const formattedCode = formattedLines.join("\n");

  // Then inject comments
  return inject_comments(formattedCode, method);
}

/**
 * Formats scene code (multi-line formatting only, no comments)
 * Used after successful validation to keep code readable
 */
export function format_scene_code(code: string): string {
  const lines = code.split("\n");
  const formattedLines = lines.map((line) => format_single_line_object(line));
  return formattedLines.join("\n");
}
