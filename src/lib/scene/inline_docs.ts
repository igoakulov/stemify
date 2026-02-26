/**
 * Formats single-line scene object calls into multi-line format
 * Example: scene.label({ id: "x", text: "y" })
 * Becomes:
 * scene.label({
 *   id: "x",
 *   text: "y"
 * })
 */
function format_single_line_object(code: string): string {
  const methodPattern = /^(\s*)(scene\.\w+)\s*\(\s*\{/;
  const methodMatch = code.match(methodPattern);

  if (!methodMatch) {
    return code;
  }

  const [, indent, methodCall] = methodMatch;

  const openParenIndex = code.indexOf("(");
  const openBraceIndex = code.indexOf("{", openParenIndex);

  if (openBraceIndex === -1) {
    return code;
  }

  let braceDepth = 1;
  let closeBraceIndex = -1;
  let inString = false;
  let stringChar = "";

  for (let i = openBraceIndex + 1; i < code.length; i++) {
    const char = code[i];
    const prevChar = i > 0 ? code[i - 1] : "";

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

  const propsContent = code.slice(openBraceIndex + 1, closeBraceIndex);
  if (propsContent.includes("\n")) {
    return code;
  }

  const afterBrace = code.slice(closeBraceIndex + 1).trim();
  const semicolon = afterBrace.startsWith(");") ? ";" : "";

  const props: string[] = [];
  let currentProp = "";
  let propBraceDepth = 0;
  let propInString = false;
  let propStringChar = "";

  for (let i = 0; i < propsContent.length; i++) {
    const char = propsContent[i];
    const prevChar = i > 0 ? propsContent[i - 1] : "";

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

  const trimmed = currentProp.trim();
  if (trimmed) {
    props.push(trimmed);
  }

  if (props.length <= 1) {
    return code;
  }

  const propIndent = indent + "  ";
  const formattedProps = props.map((p) => `${propIndent}${p},`).join("\n");

  return `${indent}${methodCall}({\n${formattedProps}\n${indent}})${semicolon}`;
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

const DOCS_MARKER = `/*====== STEMIFY GUIDE =======`;
const STEMIFY_INTRO = `1. ASK assistant about a subject
2. Tell him to BUILD a scene about it
3. Rotate, fly, explore, click on objects
4. Change their position, size, color etc...
5. Customize using DOCS below`;

const STEMIFY_DOCS = `========= USING DOCS ==========

1. Choose shape / method, copy lines
2. Paste them above STEMIFY GUIDE
3. Change or remove parameters

=========== SHAPES ===========

HINTS:
* lookat: from origin, shape would face this point
* use groups to move shapes as one
* 3+ points and cuts give new shapes

scene.point({})
scene.line({})
scene.curve({})
scene.circle({})
scene.poly2({})
scene.sphere({})
scene.cylinder({})
scene.donut({})
scene.poly3({})

======= COMPLEX SHAPES =======

scene.group({})
scene.mesh({})

======== PRESENTATION ========

scene.label({})
scene.tooltip({})
scene.animation({})

=========== GENERAL ===========

scene.grid(0.5) // round values, snap to grid
scene.smoothness(64) // round object smoothness, 64 (fastest) | 128 (balanced) | 256 (smoothest)
scene.camera({
  position: [6, 4, 8],
  lookat: [0, 0, 0]
})
======= STEMIFY GUIDE =======*/`;

export function append_docs(code: string): string {
  const stripped = strip_docs(code);
  return `${stripped}\n\n${DOCS_MARKER}\n\n${STEMIFY_INTRO}\n\n${STEMIFY_DOCS}`;
}

export function strip_docs(code: string): string {
  const markerRegex = /\/\*={4,}.*(?:STEMIFY|DOCS|GUIDE|HOW TO).*\*\//i;
  const markerMatch = code.match(markerRegex);
  if (!markerMatch) return code;
  return code.slice(0, markerMatch.index);
}

export function get_docs_marker(): string {
  return DOCS_MARKER;
}
