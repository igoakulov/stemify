import * as THREE from "three";

import type { Vec3 } from "@/lib/scene/types";

export type CurveConfig = {
  points: Vec3[];
  color?: string;
  dashed?: boolean;
};

export function create_polyline(config: CurveConfig): THREE.Line {
  const geometry = new THREE.BufferGeometry();

  const vertices = new Float32Array(config.points.length * 3);
  for (let i = 0; i < config.points.length; i += 1) {
    const p = config.points[i];
    vertices[i * 3 + 0] = p.x;
    vertices[i * 3 + 1] = p.y;
    vertices[i * 3 + 2] = p.z;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

  const material = new THREE.LineBasicMaterial({
    color: config.color ?? "#E6E8EB",
    transparent: true,
    opacity: 0.9,
  });

  const line = new THREE.Line(geometry, material);

  // Placeholder: dashed rendering can be added later with LineDashedMaterial.
  // For now, keep a simple solid line to reduce complexity.

  return line;
}
