import * as THREE from "three";

import type { Vec3, AxisRange } from "@/lib/scene/types";

function v3(p: Vec3 | undefined): THREE.Vector3 {
  return new THREE.Vector3(p?.[0] ?? 0, p?.[1] ?? 0, p?.[2] ?? 0);
}

export type AxesConfig = {
  x?: AxisRange;
  y?: AxisRange;
  z?: AxisRange;
  length?: number;
  position?: Vec3;
};

export function create_axes_group(config: AxesConfig = {}): THREE.Group {
  const length = config.length ?? 5;
  const position = config.position ?? [0, 0, 0];

  const group = new THREE.Group();
  group.position.copy(v3(position));

  const axis_radius = Math.max(0.01, length * 0.008);
  const head_radius = axis_radius * 2.2;
  const head_length = axis_radius * 6.0;

  const make_axis = (dir: THREE.Vector3, range: AxisRange | undefined, color: string) => {
    if (!range || range.length === 0) return;

    const neg_end = range[0];
    const pos_end = range[1];

    const axis_mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.05,
    });

    if (neg_end < 0) {
      const neg_length = -neg_end;
      const neg_shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(axis_radius, axis_radius, neg_length, 10),
        axis_mat,
      );
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
      neg_shaft.setRotationFromQuaternion(q);
      neg_shaft.position.copy(dir.clone().multiplyScalar(neg_end / 2));
      group.add(neg_shaft);
    }

    if (pos_end > 0) {
      const pos_length = pos_end;
      const pos_shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(axis_radius, axis_radius, pos_length, 10),
        axis_mat,
      );
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      pos_shaft.setRotationFromQuaternion(q);
      pos_shaft.position.copy(dir.clone().multiplyScalar(pos_length / 2));
      group.add(pos_shaft);

      const head = new THREE.Mesh(
        new THREE.ConeGeometry(head_radius, head_length, 12),
        axis_mat,
      );
      head.setRotationFromQuaternion(q);
      head.position.copy(dir.clone().multiplyScalar(pos_length + head_length / 2));
      group.add(head);
    }
  };

  make_axis(new THREE.Vector3(1, 0, 0), config.x, "#F25C54");
  make_axis(new THREE.Vector3(0, 1, 0), config.y, "#2FBF71");
  make_axis(new THREE.Vector3(0, 0, 1), config.z, "#2D7FF9");

  return group;
}
