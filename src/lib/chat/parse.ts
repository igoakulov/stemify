export type ParseResult =
  | {
      kind: "scene";
      code: string;
    }
  | {
      kind: "text";
      text: string;
    };

function extract_js_from_markdown(raw: string): string | null {
  const codeBlockRegex = /```(?:javascript|js)?\s*([\s\S]*?)\s*```/g;
  let match;
  let lastContent = null;

  while ((match = codeBlockRegex.exec(raw)) !== null) {
    lastContent = match[1].trim();
  }

  if (lastContent) return lastContent;

  return null;
}

export function parse_model_output(raw: string, mode?: "ask" | "build" | "fix"): ParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "text", text: "" };

  if (mode === "build" || mode === "fix") {
    const jsFromMarkdown = extract_js_from_markdown(trimmed);
    if (jsFromMarkdown) {
      return {
        kind: "scene",
        code: jsFromMarkdown,
      };
    }
  }

  return { kind: "text", text: raw };
}

export function get_scene_code(result: ParseResult): string | null {
  if (result.kind !== "scene") return null;
  const code = result.code;
  if (typeof code !== "string") return null;
  const trimmed = code.trim();
  return trimmed.length > 0 ? trimmed : null;
}
