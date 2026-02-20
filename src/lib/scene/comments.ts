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

const DOCS_MARKER = "// === HOW TO STEMIFY ===";

const STEMIFY_INTRO = `// 1. ASK assistant about a subject
// 2. Tell him to BUILD an interactive scene
// 3. Click on objects in the scene
// 4. Change their position, size, color...
// 5. Try adding more using help below`;

const STEMIFY_DOCS = `// Full documentation coming soon`;

export function append_docs(code: string): string {
  const trimmed = code.trimEnd();
  const stripped = strip_docs(trimmed);
  return `${stripped}\n\n${DOCS_MARKER}\n\n${STEMIFY_INTRO}\n\n${STEMIFY_DOCS}`;
}

export function strip_docs(code: string): string {
  const markerIndex = code.indexOf(DOCS_MARKER);
  if (markerIndex === -1) return code;
  return code.slice(0, markerIndex).trimEnd();
}

export function get_docs_marker(): string {
  return DOCS_MARKER;
}
