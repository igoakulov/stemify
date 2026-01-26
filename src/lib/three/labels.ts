import type { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

export const LABEL_STYLE = {
  font_family:
    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  font_size_px: 12,
  font_weight: "500",
  color: "#E6E8EB",
  background: "rgba(17, 19, 24, 0.55)",
  border: "1px solid rgba(230, 232, 235, 0.14)",
  border_radius_px: 8,
  padding: "2px 6px",
  letter_spacing: "0.01em",
} as const;

export function apply_label_style(label: CSS2DObject): void {
  const el = label.element as HTMLElement;

  el.style.fontFamily = LABEL_STYLE.font_family;
  el.style.fontSize = `${LABEL_STYLE.font_size_px}px`;
  el.style.fontWeight = LABEL_STYLE.font_weight;
  el.style.letterSpacing = LABEL_STYLE.letter_spacing;

  el.style.color = LABEL_STYLE.color;
  el.style.background = LABEL_STYLE.background;
  el.style.border = LABEL_STYLE.border;
  el.style.borderRadius = `${LABEL_STYLE.border_radius_px}px`;
  el.style.padding = LABEL_STYLE.padding;

  el.style.whiteSpace = "nowrap";
  el.style.userSelect = "none";
  el.style.transform = "translate(-50%, -50%)";
}