import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import renderMathInElement from "katex/contrib/auto-render";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

import { create_axes_group } from "@/lib/scene/axes";
import { apply_label_style, LABEL_STYLE } from "@/lib/three/labels";
import type { ThreeBaseTemplate } from "@/lib/three/base_template";
import { DEFAULT_AXES_ID } from "@/lib/three/base_template";
import { ObjectRegistry } from "@/lib/scene/object_registry";
import type { SceneApi, Vec3 } from "@/lib/scene/types";
import { parse_color } from "@/lib/scene/color";

type SceneApiDeps = {
  template: ThreeBaseTemplate;
  registry: ObjectRegistry;
  gridConfig?: { enabled: boolean; size: number };
};

// Mutable grid state that can be shared between API and UI
export type GridState = {
  enabled: boolean;
  size: number;
};

export function create_default_grid_state(): GridState {
  return {
    enabled: true,
    size: 0.5,
  };
}

function v3(p: Vec3 | undefined): THREE.Vector3 {
  return new THREE.Vector3(p?.[0] ?? 0, p?.[1] ?? 0, p?.[2] ?? 0);
}

function snap_to_grid(value: number, size: number): number {
  if (size <= 0) return value;
  return Math.round(value / size) * size;
}

function snap_vec3(v: Vec3 | undefined, size: number): Vec3 | undefined {
  if (!v || v.length === 0) return [0, 0, 0];
  return [
    snap_to_grid(v[0] ?? 0, size),
    snap_to_grid(v[1] ?? 0, size),
    snap_to_grid(v[2] ?? 0, size),
  ];
}

function snap_points(points: Vec3[], size: number): Vec3[] {
  if (size <= 0) return points;
  return points.map((p) => snap_vec3(p, size)!);
}

type SliceInput = [number, number] | number;

function normalize_slice(slice: SliceInput | undefined): { start: number; end: number } | undefined {
  if (slice === undefined) return undefined;
  if (typeof slice === "number") {
    return { start: 0, end: slice };
  }
  // Handle array format [start, end]
  return { start: slice[0], end: slice[1] };
}

export function create_scene_api(deps: SceneApiDeps): SceneApi {
  // Store active animations
  type AnimationFn = (elapsed: number, scene: SceneApi, THREE: typeof import("three")) => void;
  const animations = new Map<string, { fn: AnimationFn; startTime: number }>();
  let animation_frame_id: number | null = null;

  // Scene configuration
  let smoothness = 64; // Default segments for curved shapes (32, 64, 128)

  // Grid configuration
  const grid_enabled = deps.gridConfig?.enabled ?? true;
  let grid_size = deps.gridConfig?.size ?? 0.5;

  function get_snapped_center(center: Vec3 | undefined): Vec3 {
    return snap_vec3(center, grid_enabled ? grid_size : 0) ?? [0, 0, 0];
  }

  function get_snapped_points(points: Vec3[]): Vec3[] {
    return snap_points(points, grid_enabled ? grid_size : 0);
  }

  // 2D PRIMITIVES

  const addPoint: SceneApi["addPoint"] = ({
    id,
    center,
    shift,
    color,
    selectable = true,
  }) => {
    const geometry = new THREE.SphereGeometry(0.05, 16, 12);
    const material = deps.template.materials.mesh_default.clone();

    if (color) {
      material.color = parse_color(color);
    }

    const mesh = new THREE.Mesh(geometry, material);
    const base = get_snapped_center(center);
    const offset = get_snapped_center(shift);
    mesh.position.set(
      base[0] + offset[0],
      base[1] + offset[1],
      base[2] + offset[2]
    );
    mesh.userData = { id, selectable };
    deps.template.root.add(mesh);

    deps.registry.add({
      id,
      type: "point",
    }, selectable, null);

    deps.registry.attach_mesh(id, mesh);
  };

  const addLine: SceneApi["addLine"] = ({
    id,
    points,
    thickness = 0,
    arrow = "none",
    direction,
    rotation = 0,
    shift,
    color,
    opacity,
    selectable = true,
  }) => {
    let point_array: Vec3[];

    // Handle formula expression
    if (typeof points === "object" && "tMin" in points) {
      point_array = [];
      const { x: xExpr, y: yExpr, z: zExpr, tMin, tMax, tSteps } = points;
      
      try {
        for (let i = 0; i < tSteps; i++) {
          const t = tMin + (tMax - tMin) * (i / (tSteps - 1));
          const x = new Function("t", `return ${xExpr}`)(t);
          const y = new Function("t", `return ${yExpr}`)(t);
          const z = new Function("t", `return ${zExpr}`)(t);
          point_array.push([x, y, z]);
        }
      } catch (e) {
        console.warn("Invalid formula expression in addLine:", e);
        point_array = [];
      }
    } else {
      point_array = points as Vec3[];
    }

    // Only snap if points are fixed coordinates (not from formula)
    const should_snap = grid_enabled && grid_size > 0 && typeof points !== "object";
    if (should_snap) {
      point_array = get_snapped_points(point_array);
    }

    // Apply shift to all points
    if (shift) {
      const s = get_snapped_center(shift);
      point_array = point_array.map(p => [p[0] + s[0], p[1] + s[1], p[2] + s[2]]);
    }

    const curve_points = point_array.map((p) => v3(p));
    const curve = new THREE.CatmullRomCurve3(curve_points);
    
    let mesh: THREE.Object3D;

    if (thickness > 0) {
      // Tube geometry
      const tube_geometry = new THREE.TubeGeometry(curve, Math.max(1, curve_points.length - 1), thickness, 8, false);
      
      const material = deps.template.materials.mesh_default.clone();
      if (color) material.color = parse_color(color);
      if (opacity !== undefined) material.opacity = opacity;

      mesh = new THREE.Mesh(tube_geometry, material);
    } else {
      // Thin line
      const geometry = new THREE.BufferGeometry().setFromPoints(curve_points);
      const material = deps.template.materials.line_default.clone();
      if (color) material.color = parse_color(color);
      
      mesh = new THREE.Line(geometry, material);
    }

    // Apply direction and rotation
    if (direction || rotation) {
      const up = new THREE.Vector3(0, 0, 1);
      
      if (direction) {
        const dir = v3(direction).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
        mesh.setRotationFromQuaternion(quaternion);
      }
      
      if (rotation) {
        mesh.rotateZ((rotation * Math.PI) / 180);
      }
    }

    // Add arrowheads if requested
    if (arrow !== "none") {
      const arrow_group = new THREE.Group();
      arrow_group.add(mesh);

      const arrow_geometry = new THREE.ConeGeometry(thickness * 2, thickness * 6, 16);
      const arrow_material = deps.template.materials.mesh_default.clone();
      if (color) arrow_material.color = parse_color(color);
      if (opacity !== undefined) arrow_material.opacity = opacity;

      if (arrow === "end" || arrow === "both") {
        const end_arrow = new THREE.Mesh(arrow_geometry, arrow_material);
        const end_point = curve_points[curve_points.length - 1];
        const prev_point = curve_points[curve_points.length - 2] || curve_points[0];
        end_arrow.position.copy(end_point);
        // Arrow should point from previous point toward end point (forward direction)
        // lookAt makes the arrow's -Z axis point toward the target
        // We want the arrow to point AWAY from prev_point, so look at a point beyond end
        const direction = new THREE.Vector3().subVectors(end_point, prev_point).normalize();
        const look_target = end_point.clone().add(direction);
        end_arrow.lookAt(look_target);
        end_arrow.rotateX(Math.PI / 2);
        arrow_group.add(end_arrow);
      }

      if (arrow === "start" || arrow === "both") {
        const start_arrow = new THREE.Mesh(arrow_geometry, arrow_material);
        const start_point = curve_points[0];
        const next_point = curve_points[1] || curve_points[curve_points.length - 1];
        start_arrow.position.copy(start_point);
        // Arrow should point toward next point
        // lookAt makes the arrow's -Z axis point toward next_point, which is correct
        // But we need to flip it so it points outward from the start
        const direction = new THREE.Vector3().subVectors(next_point, start_point).normalize();
        const look_target = start_point.clone().sub(direction);
        start_arrow.lookAt(look_target);
        start_arrow.rotateX(-Math.PI / 2);
        arrow_group.add(start_arrow);
      }

      deps.template.root.add(arrow_group);
      arrow_group.userData = { id, selectable };
      mesh.userData = { id, selectable };
      mesh = arrow_group;
    } else {
      mesh.userData = { id, selectable };
      deps.template.root.add(mesh);
    }

    deps.registry.add({
      id,
      type: "line",
    }, selectable, null);

    deps.registry.attach_mesh(id, mesh);
  };

  const addPoly2D: SceneApi["addPoly2D"] = ({
    id,
    points,
    shift,
    color,
    opacity,
    direction,
    rotation = 0,
    selectable = true,
  }) => {
    // Apply grid snap to points
    let snapped_points = get_snapped_points(points);

    // Apply shift to all points
    if (shift) {
      const s = get_snapped_center(shift);
      snapped_points = snapped_points.map(p => [p[0] + s[0], p[1] + s[1], p[2] + s[2]]);
    }

    // Calculate center of the shape for rotation
    const centerX = snapped_points.reduce((sum, p) => sum + p[0], 0) / snapped_points.length;
    const centerY = snapped_points.reduce((sum, p) => sum + p[1], 0) / snapped_points.length;
    const centerZ = snapped_points.reduce((sum, p) => sum + p[2], 0) / snapped_points.length;

    // Create shape centered at origin
    const shape = new THREE.Shape();
    shape.moveTo(snapped_points[0][0] - centerX, snapped_points[0][2] - centerZ);

    for (let i = 1; i < snapped_points.length; i++) {
      shape.lineTo(snapped_points[i][0] - centerX, snapped_points[i][2] - centerZ);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    const material = deps.template.materials.mesh_default.clone();
    material.side = THREE.DoubleSide;

    if (color) material.color = parse_color(color);
    if (opacity !== undefined) {
      material.opacity = opacity;
      material.transparent = opacity < 1;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(centerX, centerY, centerZ);

    // Build rotation: base X (90° to lay flat), then direction, then spin
    const baseQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    
    if (direction) {
      // After base rotation, shape faces +Y (up). Rotate to face desired direction.
      const up = new THREE.Vector3(0, 1, 0);
      const dir = v3(direction).normalize();
      const dirQuat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      baseQuat.multiply(dirQuat);
    }
    
    mesh.quaternion.copy(baseQuat);
    
    if (rotation) {
      mesh.rotateZ((rotation * Math.PI) / 180);
    }

    deps.template.root.add(mesh);
    mesh.userData = { id, selectable };

    deps.registry.add({
      id,
      type: "poly2d",
    }, selectable, null);

    deps.registry.attach_mesh(id, mesh);
  };

  const addCircle: SceneApi["addCircle"] = ({
    id,
    center,
    shift,
    radius,
    direction = [0, 0, 1],
    stretch,
    anglecut,
    rotation = 0,
    color,
    opacity,
    selectable = true,
  }) => {
    // Apply grid snap to center and shift
    const base = get_snapped_center(center);
    const offset = get_snapped_center(shift);
    const snapped_center: Vec3 = [base[0] + offset[0], base[1] + offset[1], base[2] + offset[2]];

    const norm = normalize_slice(anglecut);
    const theta_start = norm ? (norm.start * Math.PI) / 180 : 0;
    const theta_length = norm ? ((norm.end - norm.start) * Math.PI) / 180 : Math.PI * 2;

    const is_outline = opacity === 0;

    let mesh: THREE.Mesh;

    if (is_outline) {
      const segments = 64;

      if (theta_length >= Math.PI * 2 - 0.001) {
        const inner_radius = radius * 0.92;
        const outer_radius = radius * 1.0;
        const geometry = new THREE.RingGeometry(inner_radius, outer_radius, segments, 1);
        const material = deps.template.materials.mesh_default.clone();
        if (color) material.color = parse_color(color);
        material.side = THREE.DoubleSide;
        mesh = new THREE.Mesh(geometry, material);
      } else {
        const points: THREE.Vector3[] = [];
        points.push(new THREE.Vector3(Math.cos(theta_start) * radius, Math.sin(theta_start) * radius, 0));
        const arc_segments = Math.ceil(segments * theta_length / (Math.PI * 2));
        for (let i = 1; i <= arc_segments; i++) {
          const theta = theta_start + (i / arc_segments) * theta_length;
          points.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
        }

        const lineGeometry = new THREE.BufferGeometry().setFromPoints([...points, points[0]]);
        const material = deps.template.materials.line_default.clone();
        if (color) material.color = parse_color(color);

        const line = new THREE.Line(lineGeometry, material);
        mesh = new THREE.Mesh(lineGeometry, material);
        mesh.add(line);
      }
    } else {
      const geometry = new THREE.CircleGeometry(radius, 64, theta_start, theta_length);
      const material = deps.template.materials.mesh_default.clone();
      if (color) material.color = parse_color(color);
      if (opacity !== undefined) {
        material.opacity = opacity;
        material.transparent = opacity < 1;
      }
      material.side = THREE.DoubleSide;
      mesh = new THREE.Mesh(geometry, material);
    }

    mesh.position.copy(v3(snapped_center));

    const normal = v3(direction).normalize();
    const up = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
    mesh.setRotationFromQuaternion(quaternion);

    mesh.rotateZ((rotation * Math.PI) / 180);

    if (stretch) {
      mesh.scale.set(stretch[0] ?? 1, stretch[1] ?? 1, stretch[2] ?? 1);
    }

    deps.template.root.add(mesh);
    mesh.userData = { id, selectable };

    deps.registry.add({
      id,
      type: "circle",
    }, selectable, null);

    deps.registry.attach_mesh(id, mesh);
  };

  // 3D PRIMITIVES

  const addSphere: SceneApi["addSphere"] = ({
    id,
    center,
    shift,
    radius,
    stretch,
    anglecut,
    flatcut,
    direction = [0, 0, 1],
    rotation = 0,
    color,
    opacity,
    selectable = true,
  }) => {
    // Apply grid snap to center and shift
    const base = get_snapped_center(center);
    const offset = get_snapped_center(shift);
    const snapped_center: Vec3 = [base[0] + offset[0], base[1] + offset[1], base[2] + offset[2]];

    // anglecut: horizontal sweep (longitude), 0 to 2π = full
    const norm_anglecut = normalize_slice(anglecut);
    const phi_start = norm_anglecut ? (norm_anglecut.start * Math.PI) / 180 : 0;
    const phi_length = norm_anglecut ? ((norm_anglecut.end - norm_anglecut.start) * Math.PI) / 180 : Math.PI * 2;
    const is_anglecut = phi_length < Math.PI * 2;

    // flatcut: vertical sweep (latitude), 0-360 degrees maps to 0-π Three.js radians
    const norm_flatcut = normalize_slice(flatcut);
    const theta_start = norm_flatcut ? (norm_flatcut.start * Math.PI) / 180 : 0;
    const theta_length = norm_flatcut ? ((norm_flatcut.end - norm_flatcut.start) * Math.PI) / 360 : Math.PI;
    const is_flatcut = theta_length < Math.PI;

    const geometry = new THREE.SphereGeometry(radius, smoothness, Math.max(8, smoothness / 2), phi_start, phi_length, theta_start, theta_length);
    const material = deps.template.materials.mesh_default.clone();
    
    if (color) material.color = parse_color(color);
    if (opacity !== undefined) {
      material.opacity = opacity;
      material.transparent = opacity < 1;
    }
    if (is_anglecut || is_flatcut) material.side = THREE.DoubleSide;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(v3(snapped_center));

    // Orient based on direction vector
    const normal = v3(direction).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
    mesh.setRotationFromQuaternion(quaternion);

    // Apply additional rotation
    mesh.rotateY((rotation * Math.PI) / 180);

    // Apply stretch if provided
    if (stretch) {
      mesh.scale.set(stretch[0] ?? 1, stretch[1] ?? 1, stretch[2] ?? 1);
    }

    deps.template.root.add(mesh);
    mesh.userData = { id, selectable };

    deps.registry.add({
      id,
      type: "sphere",
    }, selectable, null);

    deps.registry.attach_mesh(id, mesh);
  };

  const addCylinder: SceneApi["addCylinder"] = ({
    id,
    points,
    shift,
    radius,
    anglecut,
    direction,
    rotation = 0,
    color,
    opacity,
    selectable = true,
  }) => {
    // Apply grid snap to points
    let snapped_points = get_snapped_points(points);

    // Apply shift to all points
    if (shift) {
      const s = get_snapped_center(shift);
      snapped_points = snapped_points.map(p => [p[0] + s[0], p[1] + s[1], p[2] + s[2]]);
    }

    // Calculate center of all points for rotation
    const centerX = snapped_points.reduce((sum, p) => sum + p[0], 0) / snapped_points.length;
    const centerY = snapped_points.reduce((sum, p) => sum + p[1], 0) / snapped_points.length;
    const centerZ = snapped_points.reduce((sum, p) => sum + p[2], 0) / snapped_points.length;

    // Simplified approach: create separate cylinders for each segment
    const group = new THREE.Group();

    const norm = normalize_slice(anglecut);
    const theta_start = norm ? (norm.start * Math.PI) / 180 : 0;
    const theta_length = norm ? ((norm.end - norm.start) * Math.PI) / 180 : Math.PI * 2;
    const is_sliced = theta_length < Math.PI * 2;

    for (let i = 0; i < snapped_points.length - 1; i++) {
      const start = v3(snapped_points[i]);
      const end = v3(snapped_points[i + 1]);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const height = start.distanceTo(end);

      const cylinder_geometry = new THREE.CylinderGeometry(radius[i + 1], radius[i], height, smoothness, 1, false, theta_start, theta_length);
      const material = deps.template.materials.mesh_default.clone();

      if (color) material.color = parse_color(color);
      if (opacity !== undefined) {
        material.opacity = opacity;
        material.transparent = opacity < 1;
      }
      if (is_sliced) material.side = THREE.DoubleSide;

      const cylinder = new THREE.Mesh(cylinder_geometry, material);
      // Position relative to center
      cylinder.position.set(mid.x - centerX, mid.y - centerY, mid.z - centerZ);
      cylinder.lookAt(end.x - centerX, end.y - centerY, end.z - centerZ);
      cylinder.rotateX(Math.PI / 2);

      group.add(cylinder);
    }

    // Set group position to center
    group.position.set(centerX, centerY, centerZ);

    // Apply direction and rotation to entire group
    if (direction || rotation) {
      const up = new THREE.Vector3(0, 0, 1);
      
      if (direction) {
        const dir = v3(direction).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
        group.setRotationFromQuaternion(quaternion);
      }
      
      if (rotation) {
        group.rotateZ((rotation * Math.PI) / 180);
      }
    }

    deps.template.root.add(group);
    group.userData = { id, selectable };

    deps.registry.add({
      id,
      type: "cylinder",
    }, selectable, null);

    deps.registry.attach_mesh(id, group);
  };

  const addPoly3D: SceneApi["addPoly3D"] = ({
    id,
    points,
    shift,
    color,
    opacity,
    direction,
    rotation = 0,
    selectable = true,
  }) => {
    // Apply grid snap to points
    let snapped_points = get_snapped_points(points);

    // Apply shift to all points
    if (shift) {
      const s = get_snapped_center(shift);
      snapped_points = snapped_points.map(p => [p[0] + s[0], p[1] + s[1], p[2] + s[2]]);
    }

    // Calculate center of all points for rotation
    const centerX = snapped_points.reduce((sum, p) => sum + p[0], 0) / snapped_points.length;
    const centerY = snapped_points.reduce((sum, p) => sum + p[1], 0) / snapped_points.length;
    const centerZ = snapped_points.reduce((sum, p) => sum + p[2], 0) / snapped_points.length;

    let geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];

    const yValues = snapped_points.map((p) => p[1]);
    const tolerance = 0.01;

    const basePoints: typeof snapped_points = [];
    const apexPoints: typeof snapped_points = [];

    const minY = Math.min(...yValues);
    for (let i = 0; i < snapped_points.length; i++) {
      if (Math.abs(snapped_points[i][1] - minY) < tolerance) {
        basePoints.push(snapped_points[i]);
      } else {
        apexPoints.push(snapped_points[i]);
      }
    }

    const is_pyramid = basePoints.length >= 3 && apexPoints.length === 1;

    if (is_pyramid) {
      const add_triangle = (p1: Vec3, p2: Vec3, p3: Vec3) => {
        vertices.push(
          p1[0] - centerX, p1[1] - centerY, p1[2] - centerZ,
          p3[0] - centerX, p3[1] - centerY, p3[2] - centerZ,
          p2[0] - centerX, p2[1] - centerY, p2[2] - centerZ
        );
      };

      const triangulate_polygon = (polygon: Vec3[]) => {
        const n = polygon.length;
        if (n < 3) return;
        if (n === 3) {
          add_triangle(polygon[0], polygon[1], polygon[2]);
          return;
        }

        const polyCenter: Vec3 = [
          polygon.reduce((s, p) => s + p[0], 0) / n,
          polygon.reduce((s, p) => s + p[1], 0) / n,
          polygon.reduce((s, p) => s + p[2], 0) / n,
        ];

        for (let i = 0; i < n; i++) {
          const next = (i + 1) % n;
          add_triangle(polygon[i], polygon[next], polyCenter);
        }
      };

      triangulate_polygon(basePoints);

      for (const apex of apexPoints) {
        for (let i = 0; i < basePoints.length; i++) {
          const next = (i + 1) % basePoints.length;
          add_triangle(basePoints[i], basePoints[next], apex);
        }
      }
    } else {
      const three_points = snapped_points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      const convex_geometry = new ConvexGeometry(three_points);
      geometry = convex_geometry;
    }

    if (vertices.length > 0) {
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();
    }

    const material = deps.template.materials.mesh_default.clone();
    if (color) material.color = parse_color(color);
    if (opacity !== undefined) {
      material.opacity = opacity;
      material.transparent = opacity < 1;
    }
    material.side = THREE.DoubleSide;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(centerX, centerY, centerZ);

    // Apply direction and rotation
    if (direction || rotation) {
      const up = new THREE.Vector3(0, 0, 1);
      
      if (direction) {
        const dir = v3(direction).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
        mesh.setRotationFromQuaternion(quaternion);
      }
      
      if (rotation) {
        mesh.rotateZ((rotation * Math.PI) / 180);
      }
    }

    deps.template.root.add(mesh);
    mesh.userData = { id, selectable };

    deps.registry.add({
      id,
      type: "poly3d",
    }, selectable, null);

    deps.registry.attach_mesh(id, mesh);
  };

  const addDonut: SceneApi["addDonut"] = ({
    id,
    center,
    shift,
    radius,
    thickness,
    direction = [0, 0, 1],
    anglecut,
    rotation = 0,
    color,
    opacity,
    selectable = true,
  }) => {
    // Apply grid snap to center and shift
    const base = get_snapped_center(center);
    const offset = get_snapped_center(shift);
    const snapped_center: Vec3 = [base[0] + offset[0], base[1] + offset[1], base[2] + offset[2]];

    const norm = normalize_slice(anglecut);
    const arc = norm ? ((norm.end - norm.start) * Math.PI) / 180 : Math.PI * 2;
    const is_sliced = arc < Math.PI * 2;
    const geometry = new THREE.TorusGeometry(radius, thickness, Math.max(8, smoothness / 4), smoothness, arc);
    const material = deps.template.materials.mesh_default.clone();
    
    if (color) material.color = parse_color(color);
    if (opacity !== undefined) {
      material.opacity = opacity;
      material.transparent = opacity < 1;
    }
    if (is_sliced) material.side = THREE.DoubleSide;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(v3(snapped_center));

    // Orient based on direction vector
    const normal = v3(direction).normalize();
    const up = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
    mesh.setRotationFromQuaternion(quaternion);

    // Apply additional rotation
    mesh.rotateZ((rotation * Math.PI) / 180);

    deps.template.root.add(mesh);
    mesh.userData = { id, selectable };

    deps.registry.add({
      id,
      type: "donut",
    }, selectable, null);

    deps.registry.attach_mesh(id, mesh);
  };

  // INFRASTRUCTURE

  const addAxes: SceneApi["addAxes"] = ({
    id = "axes",
    x,
    y,
    z,
    length,
    position,
    selectable = false,
  } = {}) => {
    const default_axes = deps.template.scene.getObjectByName(DEFAULT_AXES_ID);
    if (default_axes) {
      deps.template.scene.remove(default_axes);
    }

    const snapped_position = position ? get_snapped_center(position) : undefined;
    const axes = create_axes_group({ x, y, z, length, position: snapped_position });
    deps.template.root.add(axes);
    axes.userData = { id, selectable };

    deps.registry.add({
      id,
      type: "axes",
    }, selectable, null);
  };

  const addLabel: SceneApi["addLabel"] = ({ id, text, position, color, fontSizePx, selectable = true }) => {
    // Apply grid snap to position
    const snapped_position = get_snapped_center(position);

    const div = document.createElement("div");
    div.textContent = text;

    if (/\\\(|\\\[|\$\$|\$/.test(text)) {
      renderMathInElement(div, {
        throwOnError: false,
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
        ],
      });
    }

    const label = new CSS2DObject(div);
    label.position.copy(v3(snapped_position));

    apply_label_style(label, id);

    if (color) {
      (label.element as HTMLElement).style.color = color;
    }

    if (fontSizePx) {
      (label.element as HTMLElement).style.fontSize = `${fontSizePx}px`;
    } else {
      (label.element as HTMLElement).style.fontSize = `${LABEL_STYLE.font_size_px}px`;
    }

    deps.template.root.add(label);
    label.userData = { id, selectable };

    deps.registry.add({
      id,
      type: "label",
    }, selectable, null);

    deps.registry.attach_mesh(id, label);
  };

  const addGroup: SceneApi["addGroup"] = ({
    id,
    children,
    direction,
    rotation = 0,
    shift,
    selectable = true,
  }) => {
    const group = new THREE.Group();

    let totalX = 0;
    let totalY = 0;
    let totalZ = 0;
    let childCount = 0;

    children.forEach((child_id) => {
      const child = deps.registry.get_mesh(child_id);
      if (child) {
        totalX += child.position.x;
        totalY += child.position.y;
        totalZ += child.position.z;
        childCount++;
      }
    });

    const centerX = childCount > 0 ? totalX / childCount : 0;
    const centerY = childCount > 0 ? totalY / childCount : 0;
    const centerZ = childCount > 0 ? totalZ / childCount : 0;

    children.forEach((child_id) => {
      const child = deps.registry.get_mesh(child_id);
      if (child) {
        child.position.x -= centerX;
        child.position.y -= centerY;
        child.position.z -= centerZ;
        group.add(child);
      }
      deps.registry.set_parent(child_id, id);
    });

    group.position.set(centerX, centerY, centerZ);
    if (shift) {
      const snapped_shift = get_snapped_center(shift);
      group.position.x += snapped_shift[0];
      group.position.y += snapped_shift[1];
      group.position.z += snapped_shift[2];
    }

    if (direction) {
      const up = new THREE.Vector3(0, 0, 1);
      const dir = v3(direction).normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
      group.applyQuaternion(quaternion);
    }
    
    if (rotation) {
      group.rotateZ((rotation * Math.PI) / 180);
    }

    deps.template.root.add(group);
    group.userData = { id, selectable };

    deps.registry.add({
      id,
      type: "group",
    }, selectable, null);

    deps.registry.attach_mesh(id, group);
  };

  const addAnimation: SceneApi["addAnimation"] = ({ id, updateFunction }) => {
    try {
      const fn = new Function("elapsed", "scene", "THREE", updateFunction) as AnimationFn;

      animations.set(id, {
        fn,
        startTime: performance.now(),
      });
    } catch (e) {
      console.warn("Invalid animation function:", e);
    }

    // Start animation loop if not already running
    if (!animation_frame_id) {
      const animate = () => {
        const now = performance.now();
        
        animations.forEach((anim, name) => {
          const elapsed = (now - anim.startTime) / 1000;
          try {
            anim.fn(elapsed, api, THREE);
          } catch (e) {
            console.error(`Animation error (${name}):`, e);
          }
        });

        animation_frame_id = requestAnimationFrame(animate);
      };
      animation_frame_id = requestAnimationFrame(animate);
    }
  };

  const addCustomMesh: SceneApi["addCustomMesh"] = ({
    id,
    createFn,
    center,
    shift,
    color,
    direction,
    rotation = 0,
    selectable = true,
  }) => {
    let mesh: THREE.Mesh | null = null;
    try {
      const fn = new Function("THREE", createFn);
      mesh = fn(THREE) as THREE.Mesh;

      if (!mesh) {
        console.warn(`Custom mesh "${id}" did not return a mesh`);
        return;
      }
    } catch (e) {
      console.warn("Invalid custom mesh function:", e);
      return;
    }

    if (mesh && color && mesh.material) {
      const material = (mesh.material as THREE.Material).clone();
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color = parse_color(color);
      }
      mesh.material = material;
    }

    const base = get_snapped_center(center);
    const offset = get_snapped_center(shift);
    mesh.position.set(base[0] + offset[0], base[1] + offset[1], base[2] + offset[2]);

    // Apply direction and rotation
    if (direction || rotation) {
      const up = new THREE.Vector3(0, 0, 1);
      
      if (direction) {
        const dir = v3(direction).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
        mesh.setRotationFromQuaternion(quaternion);
      }
      
      if (rotation) {
        mesh.rotateZ((rotation * Math.PI) / 180);
      }
    }

    deps.template.root.add(mesh);
    mesh.userData = { id, selectable };

    deps.registry.add({
      id,
      type: "custom",
    }, selectable, null);

    deps.registry.attach_mesh(id, mesh);
  };

  const addTooltip: SceneApi["addTooltip"] = ({ id, title, properties }) => {
    deps.registry.register_hover(id, { title, properties });
  };

  const setGrid: SceneApi["setGrid"] = (size) => {
    grid_size = size;
  };

  const setSmoothness: SceneApi["setSmoothness"] = (segments) => {
    // Set the number of segments for curved shapes (32=low, 64=default, 128=high)
    smoothness = Math.max(8, Math.min(256, segments));
  };

  const getObject: SceneApi["getObject"] = (id) => {
    return deps.registry.get_mesh(id);
  };

  const listObjects: SceneApi["listObjects"] = () => {
    return deps.registry.list();
  };

  const api: SceneApi = {
    // 2D Primitives
    addPoint,
    addLine,
    addPoly2D,
    addCircle,

    // 3D Primitives
    addSphere,
    addCylinder,
    addPoly3D,
    addDonut,

    // Infrastructure
    addAxes,
    addLabel,
    addGroup,
    addAnimation,
    addCustomMesh,
    addTooltip,
    setGrid,
    setSmoothness,
    getObject,
    listObjects,
  };

  return api;
}
