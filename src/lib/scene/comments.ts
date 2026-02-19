type CommentDictionary = Record<string, Record<string, string>>;

const COMMENTS: CommentDictionary = {
  addLine: {
    points: "// Smooth line through any number of points",
    arrow: '// "none" / "end" / "both" for arrows',
    direction: "// Face {x:0, y:0, z:1} direction relative to self",
    rotation: "// Spin clockwise: degrees. 180=flipped",
  },
  addPoly2D: {
    points: "// Corners. 3=triangle, 4=rectangle, 5+=polygon",
    direction: "// Face {x:0, y:0, z:1} direction relative to self",
    rotation: "// Spin clockwise: degrees. 180=flipped",
    opacity: "// 1=solid fill, 0=outline, 0.5=semi-transparent",
  },
  addCircle: {
    direction: "// Face {x:0, y:0, z:1} direction relatively to self",
    slice:
      "// Cut: number (180=half, 90=quarter), or {start,end} for specific arc",
    stretch: "// Make oval: {x:2, y:1}=stretched 2x horizontally",
  },
  addSphere: {
    slice: "// Cut: number (180=half), or {start,end} for specific arc",
    stretch: "// Make oval: {x:2, y:1, z:1}=stretched 2x horizontally",
    direction: "// Face {x:0, y:0, z:1} direction relative to self",
    rotation: "// Spin clockwise: degrees. 180=flipped",
  },
  addCylinder: {
    points: "// Ends of sections. >2 points=multi-section.",
    radius: "// Width at each point. 2,2=cylinder, 2,0=cone, 2,0.2,2=hourglass",
    direction: "// Face {x:0, y:0, z:1} direction relative to self",
    rotation: "// Spin clockwise: degrees. 180=flipped",
  },
  addPoly3D: {
    direction: "// Face {x:0, y:0, z:1} direction relative to self",
    rotation: "// Spin clockwise: degrees. 180=flipped",
    points: "// Corners. Order matters: connect in order, then back to start",
  },
  addDonut: {
    slice: "// 180=cut arc from start. {90,270}=cut specific section.",
  },
  addAxes: {
    length: "// How far each axis extends from origin in both directions",
    position: "// Origin point, recommended at {x:0, y:0, z:0}",
  },
  addLabel: {
    text: "// Text. Use $...$ for math expressions: $x^2$ = x squared",
    fontSizePx: "// Text size: 12-24",
  },
  addGroup: {
    children: "// IDs of objects inside group, will move/rotate as one",
    direction: "// Face {x:0, y:0, z:1} direction relative to self",
    rotation: "// Spin clockwise: degrees. 180=flipped",
  },
  addTooltip: {
    title: "// Title shown when selecting object",
    properties:
      '// "This is a wheel", or structured info: { label: "Mass", value: "5kg" }',
  },
  addAnimation: {
    updateFunction:
      '// Edit duration/movement or write your own code. Runs every frame (~60 times/sec). Use "elapsed" for time.',
  },
  addCustomMesh: {
    createFn: "// Custom Three.js code for advanced shapes",
    direction: "// Face {x:0, y:0, z:1} direction relative to self",
    rotation: "// Spin clockwise: degrees. 180=flipped",
  },
};

const GLOBAL_COMMENTS: Record<string, string> = {
  id: '// Name: "wheel", "pendulum"',
  opacity: "// 1=solid, 0=transparent. 0.5=semi-transparent",
  direction: "// Face {x:0, y:0, z:1} direction relative to self",
  rotation: "// Spin clockwise: degrees. 180=flipped",
  selectable: "// true=can click to inspect/edit code, false=cannot",
};

const SCENE_INTRO = `// Welcome to your Stemify scene code

// 1. Click on object in scene
// 2. Edit its size, shape, color...
// 3. Scene will update on the fly!

// Stay under 50 objects / 100k polygons
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
