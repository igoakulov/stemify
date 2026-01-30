export type ParsedScenePayload = {
  scene: {
    sceneCode?: unknown;
    objects?: unknown;
    camera?: unknown;
  };
  comment?: {
    markdown?: unknown;
  };
};

export type ParseResult =
  | {
      kind: "json";
      payload: ParsedScenePayload;
    }
  | {
      kind: "text";
      text: string;
    };

export function parse_model_output(raw: string): ParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "text", text: "" };

  // Fast path: starts like JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return {
        kind: "json",
        payload: JSON.parse(trimmed) as ParsedScenePayload,
      };
    } catch {
      // fall through
    }
  }

  // Fallback: attempt to extract the first JSON object substring.
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const candidate = trimmed.slice(first, last + 1);
    try {
      return {
        kind: "json",
        payload: JSON.parse(candidate) as ParsedScenePayload,
      };
    } catch {
      // ignore
    }
  }

  return { kind: "text", text: raw };
}

export function get_scene_code(payload: ParsedScenePayload): string | null {
  const code = payload.scene?.sceneCode;
  if (typeof code !== "string") return null;
  const trimmed = code.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function get_comment_markdown(payload: ParsedScenePayload): string | null {
  const md = payload.comment?.markdown;
  if (typeof md !== "string") return null;
  const trimmed = md.trim();
  return trimmed.length > 0 ? trimmed : null;
}
