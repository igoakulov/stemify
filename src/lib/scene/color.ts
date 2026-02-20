import * as THREE from "three";

export function parse_color(color: string): THREE.Color {
  const hex8Match = color.match(/^#([0-9a-fA-F]{8})$/);
  if (hex8Match) {
    const hex = parseInt(hex8Match[1], 16);
    const r = ((hex >> 24) & 0xff) / 255;
    const g = ((hex >> 16) & 0xff) / 255;
    const b = ((hex >> 8) & 0xff) / 255;
    return new THREE.Color(r, g, b);
  }

  return new THREE.Color(color);
}
