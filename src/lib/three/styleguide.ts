import * as THREE from "three";

export const STYLE_COLORS = {
  background: "#111318",

  neutral_text: "#E6E8EB",
  neutral_secondary: "#AAB2BD",

  accent_blue: "#2D7FF9",
  accent_red: "#F25C54",
  accent_yellow: "#F2C14E",
  accent_green: "#2FBF71",
  accent_violet: "#B07CFF",

  label_bg: "rgba(17, 19, 24, 0.55)",
  label_border: "rgba(230, 232, 235, 0.14)",
} as const;

export type StyleMaterials = {
  mesh_default: THREE.MeshStandardMaterial;
  mesh_accent: THREE.MeshStandardMaterial;
  grid_line: THREE.LineBasicMaterial;
};

export function create_style_materials(): StyleMaterials {
  const mesh_default = new THREE.MeshStandardMaterial({
    color: STYLE_COLORS.neutral_secondary,
    roughness: 0.55,
    metalness: 0.05,
  });

  const mesh_accent = new THREE.MeshStandardMaterial({
    color: STYLE_COLORS.accent_blue,
    roughness: 0.45,
    metalness: 0.05,
  });

  const grid_line = new THREE.LineBasicMaterial({
    color: STYLE_COLORS.neutral_text,
    transparent: true,
    opacity: 0.08,
  });

  return { mesh_default, mesh_accent, grid_line };
}
