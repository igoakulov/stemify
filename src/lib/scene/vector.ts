import * as THREE from "three";

import type { Vec3 } from "@/lib/scene/types";

export type VectorConfig = {
  from: Vec3;
  to: Vec3;
  color?: string;
};

function v3(p: Vec3): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.y, p.z);
}

export function create_vector_group(config: VectorConfig): THREE.Group {
  const from = v3(config.from);
  const to = v3(config.to);
  const dir = to.clone().sub(from);

  const length = dir.length();
  const group = new THREE.Group();

  if (length <= 0) return group;

  const unit = dir.clone().normalize();
  const head_length = Math.min(0.35, length * 0.25);
  const shaft_length = Math.max(0, length - head_length);

  const mat = new THREE.MeshStandardMaterial({
    color: config.color ?? "#2D7FF9",
    roughness: 0.5,
    metalness: 0.05,
  });

  const shaft_radius = Math.max(0.01, length * 0.01);
  const head_radius = shaft_radius * 2.0;

  // Shaft (cylinder along +Y, rotate to direction)
  if (shaft_length > 0.0001) {
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(shaft_radius, shaft_radius, shaft_length, 12),
      mat,
    );

    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), unit);
    shaft.setRotationFromQuaternion(q);

    const shaft_center = from.clone().add(unit.clone().multiplyScalar(shaft_length / 2));
    shaft.position.copy(shaft_center);

    group.add(shaft);
  }

  // Head (cone)
  const head = new THREE.Mesh(new THREE.ConeGeometry(head_radius, head_length, 16), mat);
  {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), unit);
    head.setRotationFromQuaternion(q);

    const head_center = from.clone().add(unit.clone().multiplyScalar(shaft_length + head_length / 2));
    head.position.copy(head_center);
  }

  group.add(head);

  return group;
}
