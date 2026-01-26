import * as THREE from "three";

import type { Vec3 } from "@/lib/scene/types";

function v3(p: Vec3): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.y, p.z);
}

export type AxesConfig = {
  length?: number;
  position?: Vec3;
};

export function create_axes_group(config: AxesConfig = {}): THREE.Group {
  const length = config.length ?? 5;
  const position = config.position ?? { x: 0, y: 0, z: 0 };

  const group = new THREE.Group();
  group.position.copy(v3(position));

  const axis_radius = Math.max(0.01, length * 0.008);
  const head_radius = axis_radius * 2.2;
  const head_length = axis_radius * 6.0;

  const make_axis = (dir: THREE.Vector3, color: string) => {
    const axis_mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.05,
    });

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(axis_radius, axis_radius, length, 10),
      axis_mat,
    );

    // Cylinder is Y-up by default; rotate to match dir.
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    shaft.setRotationFromQuaternion(q);
    shaft.position.copy(dir.clone().multiplyScalar(length / 2));

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(head_radius, head_length, 12),
      axis_mat,
    );
    head.setRotationFromQuaternion(q);
    head.position.copy(dir.clone().multiplyScalar(length + head_length / 2));

    group.add(shaft);
    group.add(head);
  };

  make_axis(new THREE.Vector3(1, 0, 0), "#F25C54");
  make_axis(new THREE.Vector3(0, 1, 0), "#2FBF71");
  make_axis(new THREE.Vector3(0, 0, 1), "#2D7FF9");

  return group;
}
