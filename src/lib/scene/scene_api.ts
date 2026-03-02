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

// Custom curve class for curve - passes through points directly
class PointsCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private points: THREE.Vector3[]) {
    super();
  }

  getPoint(t: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
    const clampedT = Math.max(0, Math.min(1, t));
    const index = clampedT * (this.points.length - 1);
    const i0 = Math.floor(index);
    const i1 = Math.min(i0 + 1, this.points.length - 1);
    const localT = index - i0;

    return optionalTarget.copy(this.points[i0]).lerp(this.points[i1], localT);
  }
}

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

export type SceneApiReturn = {
  api: SceneApi;
  get_camera_was_set: () => boolean;
  get_animation_frame_id: () => number | null;
  cancel_animation: () => void;
  reset: () => void;
};

export function create_scene_api(deps: SceneApiDeps): SceneApiReturn {
  // Store active animations
  type AnimationFn = (
    elapsed: number,
    scene: SceneApi,
    THREE: typeof import("three"),
  ) => void;
  const animations = new Map<string, { fn: AnimationFn; startTime: number }>();
  let animation_frame_id: number | null = null;

  // Scene configuration
  let smoothness_segments = 64; // Default segments for curved shapes (32, 64, 128)

  // Grid configuration
  const grid_enabled = deps.gridConfig?.enabled ?? true;
  let grid_size = deps.gridConfig?.size ?? 0.5;

  // Camera configuration - tracks if LLM set camera
  let camera_was_set = false;

  function get_snapped_center(center: Vec3 | undefined): Vec3 {
    return snap_vec3(center, grid_enabled ? grid_size : 0) ?? [0, 0, 0];
  }

  // 2D PRIMITIVES

  const point: SceneApi["point"] = ({
    id,
    position,
    offset,
    color,
    selectable = true,
  }) => {
    const geometry = new THREE.IcosahedronGeometry(0.05, 0);
    const material = deps.template.materials.mesh_default.clone();

    if (color) {
      material.color = parse_color(color);
    }

    const mesh = new THREE.Mesh(geometry, material);
    const base = get_snapped_center(position);
    const offset_val = offset ?? [0, 0, 0];
    mesh.position.set(
      base[0] + offset_val[0],
      base[1] + offset_val[1],
      base[2] + offset_val[2],
    );
    mesh.userData = { id, selectable };
    deps.template.root.add(mesh);

    deps.registry.add({ id, type: "point" }, selectable, null);
    deps.registry.attach_mesh(id, mesh);
  };

  const line: SceneApi["line"] = ({
    id,
    points,
    tension = 1,
    lookat: lookatTarget,
    spin = 0,
    thickness = 0,
    arrow = "none",
    offset,
    color,
    selectable = true,
  }) => {
    // Apply offset to all points (world space) - don't snap yet
    const point_array = offset
      ? points.map((p) => [
          (p[0] ?? 0) + (offset[0] ?? 0),
          (p[1] ?? 0) + (offset[1] ?? 0),
          (p[2] ?? 0) + (offset[2] ?? 0),
        ])
      : points.map((p) => [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0]);

    if (grid_enabled && grid_size > 0) {
    }

    // Calculate AABB center as pivot point
    const aabb_min = [
      Math.min(...point_array.map((p) => p[0])),
      Math.min(...point_array.map((p) => p[1])),
      Math.min(...point_array.map((p) => p[2])),
    ];
    const aabb_max = [
      Math.max(...point_array.map((p) => p[0])),
      Math.max(...point_array.map((p) => p[1])),
      Math.max(...point_array.map((p) => p[2])),
    ];
    const midpoint = [
      (aabb_min[0] + aabb_max[0]) / 2,
      (aabb_min[1] + aabb_max[1]) / 2,
      (aabb_min[2] + aabb_max[2]) / 2,
    ];
    const anchor = v3(midpoint);

    // Transform points relative to anchor
    const local_points = point_array.map((p) => v3(p).sub(anchor));

    // Get default direction: +Z axis of bounding box (local Z)
    const current_normal = new THREE.Vector3(0, 0, 1);

    // Apply lookat rotation - rotate so +Z axis points to lookat target
    if (lookatTarget) {
      const target_normal = new THREE.Vector3(
        lookatTarget[0],
        lookatTarget[1],
        lookatTarget[2],
      ).normalize();

      if (
        current_normal.lengthSq() > 0.0001 &&
        target_normal.lengthSq() > 0.0001
      ) {
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          current_normal,
          target_normal,
        );
        for (const pt of local_points) {
          pt.applyQuaternion(quaternion);
        }
      }
    }

    // Create curve - use "catmullrom" type so tension works
    // Invert: user 0 = round (soft), user 1 = rigid (straight)
    const curve = new THREE.CatmullRomCurve3(
      local_points,
      false,
      "catmullrom",
      1 - tension,
    );

    // Sample curve to get actual geometry points (respects tension)
    const sampled_points: THREE.Vector3[] = [];
    const num_samples = Math.max(local_points.length * 4, 32);
    for (let i = 0; i <= num_samples; i++) {
      sampled_points.push(curve.getPointAt(i / num_samples));
    }

    // Spin axis: direction that local +Z points to after lookat (local Z in world space)
    // If lookat is set, spin around that direction; otherwise default to world +Z
    let spin_axis: THREE.Vector3;
    if (lookatTarget) {
      spin_axis = v3(lookatTarget).normalize();
    } else {
      spin_axis = new THREE.Vector3(0, 0, 1);
    }

    let mesh: THREE.Object3D;

    if (thickness > 0) {
      // Tube geometry - use the curve directly (respects tension)
      const tube_geometry = new THREE.TubeGeometry(
        curve,
        64,
        thickness,
        8,
        false,
      );

      const material = deps.template.materials.mesh_default.clone();
      if (color) material.color = parse_color(color);

      mesh = new THREE.Mesh(tube_geometry, material);
    } else {
      // Thin line - use sampled points (respects tension)
      const geometry = new THREE.BufferGeometry().setFromPoints(sampled_points);
      const material = deps.template.materials.line_default.clone();
      if (color) material.color = parse_color(color);

      mesh = new THREE.Line(geometry, material);
    }

    // Apply spin around lookat axis (relative to local space)
    if (spin && spin_axis.lengthSq() > 0.0001) {
      mesh.rotateOnAxis(spin_axis, (spin * Math.PI) / 180);
    }

    // Apply all transforms first, then snap anchor position
    if (grid_enabled && grid_size > 0) {
      const snappedAnchor = snap_vec3(
        [anchor.x, anchor.y, anchor.z],
        grid_size,
      ) ?? [anchor.x, anchor.y, anchor.z];
      anchor.set(snappedAnchor[0], snappedAnchor[1], snappedAnchor[2]);
    }

    // Position mesh at anchor
    mesh.position.copy(anchor);

    // Add arrowheads if requested - add as children of mesh so they inherit spin
    if (arrow !== "none") {
      // Minimum arrow size
      const arrow_thickness = Math.max(thickness * 2, 0.05);
      const arrow_geometry = new THREE.ConeGeometry(
        arrow_thickness,
        arrow_thickness * 6,
        16,
      );
      const arrow_material = deps.template.materials.mesh_default.clone();
      if (color) arrow_material.color = parse_color(color);

      // Arrow directions - no spin needed since arrows are children of mesh (inherit rotation)
      // Start arrow direction (from start toward next point - arrow points OUTWARD)
      const start_dir =
        local_points.length > 1
          ? new THREE.Vector3()
              .subVectors(local_points[1], local_points[0])
              .normalize()
          : new THREE.Vector3(1, 0, 0);

      // End arrow direction (from prev point toward end - arrow points OUTWARD)
      const end_dir =
        local_points.length > 1
          ? new THREE.Vector3()
              .subVectors(
                local_points[local_points.length - 1],
                local_points[local_points.length - 2],
              )
              .normalize()
          : new THREE.Vector3(1, 0, 0);

      // Get actual endpoints from the sampled curve (respects tension)
      const actual_start = curve.getPointAt(0);
      const actual_end = curve.getPointAt(1);

      if (arrow === "end" || arrow === "both") {
        const end_arrow = new THREE.Mesh(arrow_geometry, arrow_material);
        end_arrow.position.copy(actual_end);
        const look_target = actual_end.clone().add(end_dir);
        end_arrow.lookAt(look_target);
        end_arrow.rotateX(Math.PI / 2);
        mesh.add(end_arrow);
      }

      if (arrow === "start" || arrow === "both") {
        const start_arrow = new THREE.Mesh(arrow_geometry, arrow_material);
        start_arrow.position.copy(actual_start);
        const look_target = actual_start.clone().sub(start_dir);
        start_arrow.lookAt(look_target);
        start_arrow.rotateX(Math.PI / 2);
        mesh.add(start_arrow);
      }

      deps.template.root.add(mesh);
      mesh.userData = { id, selectable };
    } else {
      mesh.userData = { id, selectable };
      deps.template.root.add(mesh);
    }

    deps.registry.add(
      {
        id,
        type: "line",
      },
      selectable,
      null,
    );

    deps.registry.attach_mesh(id, mesh);
  };

  const curve: SceneApi["curve"] = ({
    id,
    steps = 64,
    tMin,
    tMax,
    x: xInput,
    y: yInput,
    z: zInput = 0,
    lookat: lookatTarget,
    spin = 0,
    thickness = 0,
    arrow = "none",
    offset,
    color,
    selectable = true,
  }) => {
    // Evaluate formula at steps
    const point_array: Vec3[] = [];

    try {
      // Evaluate tMin/tMax if formulas
      const tMinVal = typeof tMin === "string" ? new Function(`return ${tMin}`)() : tMin;
      const tMaxVal = typeof tMax === "string" ? new Function(`return ${tMax}`)() : tMax;

      const xExpr = typeof xInput === "string" ? xInput : String(xInput);
      const yExpr = typeof yInput === "string" ? yInput : String(yInput);
      const zExpr = typeof zInput === "string" ? zInput : String(zInput);

      const xFn = new Function("t", `return ${xExpr}`);
      const yFn = new Function("t", `return ${yExpr}`);
      const zFn = new Function("t", `return ${zExpr}`);

      for (let i = 0; i < steps; i++) {
        const t = tMinVal + (tMaxVal - tMinVal) * (i / (steps - 1));
        const x = xFn(t);
        const y = yFn(t);
        const z = zFn(t);
        point_array.push([x, y, z]);
      }
    } catch (e) {
      console.warn("Invalid formula expression in curve:", e);
      return;
    }

    // Apply offset (world space)
    if (offset) {
      const s = get_snapped_center(offset);
      for (const pt of point_array) {
        pt[0] += s[0];
        pt[1] += s[1];
        pt[2] += s[2];
      }
    }

    // Calculate AABB center as pivot point
    const aabb_min = [
      Math.min(...point_array.map((p) => p[0])),
      Math.min(...point_array.map((p) => p[1])),
      Math.min(...point_array.map((p) => p[2])),
    ];
    const aabb_max = [
      Math.max(...point_array.map((p) => p[0])),
      Math.max(...point_array.map((p) => p[1])),
      Math.max(...point_array.map((p) => p[2])),
    ];
    const midpoint = [
      (aabb_min[0] + aabb_max[0]) / 2,
      (aabb_min[1] + aabb_max[1]) / 2,
      (aabb_min[2] + aabb_max[2]) / 2,
    ];
    const anchor = v3(midpoint);

    // Transform points relative to anchor
    const local_points = point_array.map((p) => v3(p).sub(anchor));

    // Get default direction: +Z axis of bounding box (local Z)
    const current_normal = new THREE.Vector3(0, 0, 1);

    // Apply lookat rotation - rotate so +Z axis points to lookat target
    if (lookatTarget) {
      const target_normal = new THREE.Vector3(
        lookatTarget[0],
        lookatTarget[1],
        lookatTarget[2],
      ).normalize();

      if (
        current_normal.lengthSq() > 0.0001 &&
        target_normal.lengthSq() > 0.0001
      ) {
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          current_normal,
          target_normal,
        );
        for (const pt of local_points) {
          pt.applyQuaternion(quaternion);
        }
      }
    }

    // Spin axis: direction that local +Z points to after lookat (local Z in world space)
    // If lookat is set, spin around that direction; otherwise default to world +Z
    let spin_axis: THREE.Vector3;
    if (lookatTarget) {
      spin_axis = v3(lookatTarget).normalize();
    } else {
      spin_axis = new THREE.Vector3(0, 0, 1);
    }

    let mesh: THREE.Object3D;

    if (thickness > 0) {
      // Create tube from custom curve (passes through formula points directly)
      const path = new PointsCurve(local_points);
      const tube_geometry = new THREE.TubeGeometry(
        path,
        local_points.length * 2,
        thickness,
        8,
        false,
      );
      const material = deps.template.materials.mesh_default.clone();
      if (color) material.color = parse_color(color);
      mesh = new THREE.Mesh(tube_geometry, material);
    } else {
      // Direct line from formula points (no smoothing)
      const geometry = new THREE.BufferGeometry().setFromPoints(local_points);
      const material = deps.template.materials.line_default.clone();
      if (color) material.color = parse_color(color);
      mesh = new THREE.Line(geometry, material);
    }

    // Apply spin around lookat axis
    if (spin && spin_axis.lengthSq() > 0.0001) {
      mesh.rotateOnAxis(spin_axis, (spin * Math.PI) / 180);
    }

    // Position mesh at anchor
    mesh.position.copy(anchor);

    // Add arrowheads if requested - add as children of mesh so they inherit spin
    if (arrow !== "none") {
      const arrow_thickness = Math.max(thickness * 2, 0.05);
      const arrow_geometry = new THREE.ConeGeometry(
        arrow_thickness,
        arrow_thickness * 6,
        16,
      );
      const arrow_material = deps.template.materials.mesh_default.clone();
      if (color) arrow_material.color = parse_color(color);

      // Arrow directions - no spin needed since arrows are children of mesh (inherit rotation)
      const start_dir =
        local_points.length > 1
          ? new THREE.Vector3()
              .subVectors(local_points[1], local_points[0])
              .normalize()
          : new THREE.Vector3(1, 0, 0);
      const end_dir =
        local_points.length > 1
          ? new THREE.Vector3()
              .subVectors(
                local_points[local_points.length - 1],
                local_points[local_points.length - 2],
              )
              .normalize()
          : new THREE.Vector3(1, 0, 0);

      // Get actual endpoints from formula
      const actual_start = local_points[0].clone();
      const actual_end = local_points[local_points.length - 1].clone();

      if (arrow === "end" || arrow === "both") {
        const end_arrow = new THREE.Mesh(arrow_geometry, arrow_material);
        end_arrow.position.copy(actual_end);
        const look_target = actual_end.clone().add(end_dir);
        end_arrow.lookAt(look_target);
        end_arrow.rotateX(Math.PI / 2);
        mesh.add(end_arrow);
      }

      if (arrow === "start" || arrow === "both") {
        const start_arrow = new THREE.Mesh(arrow_geometry, arrow_material);
        start_arrow.position.copy(actual_start);
        const look_target = actual_start.clone().sub(start_dir);
        start_arrow.lookAt(look_target);
        start_arrow.rotateX(Math.PI / 2);
        mesh.add(start_arrow);
      }

      deps.template.root.add(mesh);
      mesh.userData = { id, selectable };
    } else {
      mesh.userData = { id, selectable };
      deps.template.root.add(mesh);
    }

    deps.registry.add(
      {
        id,
        type: "line",
      },
      selectable,
      null,
    );

    deps.registry.attach_mesh(id, mesh);
  };

  const poly2: SceneApi["poly2"] = ({
    id,
    points,
    offset,
    position,
    color,
    opacity,
    lookat: lookatTarget,
    spin = 0,
    selectable = true,
  }) => {
    if (points.length < 3) return;

    // Use points as-is (no snapping - preserves local shape composition)
    // Only snap position and offset for global placement
    if (grid_enabled && grid_size > 0) {
    }

    // Compute bounding box center
    const xs = points.map((p) => p[0] ?? 0);
    const ys = points.map((p) => p[1] ?? 0);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

    // Create shape centered at origin
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0] - centerX, points[0][1] - centerY);

    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i][0] - centerX, points[i][1] - centerY);
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

    // Position: if provided use it, otherwise use center - DON'T snap yet
    let finalPos: Vec3;
    if (position) {
      finalPos = [position[0] ?? 0, position[1] ?? 0, position[2] ?? 0];
    } else {
      finalPos = [centerX, centerY, 0];
    }

    // Apply offset (don't snap yet)
    if (offset) {
      finalPos = [
        finalPos[0] + (offset[0] ?? 0),
        finalPos[1] + (offset[1] ?? 0),
        finalPos[2] + (offset[2] ?? 0),
      ];
    }

    // Apply all transforms first, then snap final position
    if (grid_enabled && grid_size > 0) {
      finalPos = [
        snap_to_grid(finalPos[0], grid_size),
        snap_to_grid(finalPos[1], grid_size),
        snap_to_grid(finalPos[2], grid_size),
      ];
    }

    mesh.position.set(finalPos[0], finalPos[1], finalPos[2]);

    // lookat: rotate from +Z to target direction
    const effective_lookat = lookatTarget ?? [0, 0, 1];
    const normal = v3(effective_lookat).normalize();
    const up = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
    mesh.setRotationFromQuaternion(quaternion);

    // spin: rotate around lookat axis (local Z after lookat rotation)
    if (spin) {
      mesh.rotateOnAxis(new THREE.Vector3(0, 0, 1), (spin * Math.PI) / 180);
    }

    deps.template.root.add(mesh);
    mesh.userData = { id, selectable };

    deps.registry.add(
      {
        id,
        type: "poly2",
      },
      selectable,
      null,
    );

    deps.registry.attach_mesh(id, mesh);
  };

  const circle: SceneApi["circle"] = ({
    id,
    position,
    offset,
    radius = 1,
    lookat,
    stretch,
    anglecut,
    spin = 0,
    color,
    opacity,
    outline,
    selectable = true,
  }) => {
    // Calculate final position from position + offset first, then snap
    let finalPos: Vec3 = [
      (position?.[0] ?? 0) + (offset?.[0] ?? 0),
      (position?.[1] ?? 0) + (offset?.[1] ?? 0),
      (position?.[2] ?? 0) + (offset?.[2] ?? 0),
    ];

    if (grid_enabled && grid_size > 0) {
      finalPos = [
        snap_to_grid(finalPos[0], grid_size),
        snap_to_grid(finalPos[1], grid_size),
        snap_to_grid(finalPos[2], grid_size),
      ];
    }

    const snapped_center = finalPos;

    // anglecut: [thetaStart, thetaLength] in degrees, or single number = thetaLength from 0
    let theta_start = 0;
    let theta_length = Math.PI * 2;
    if (anglecut !== undefined) {
      if (typeof anglecut === "number") {
        theta_start = 0;
        theta_length = (Math.min(anglecut, 360) * Math.PI) / 180;
      } else {
        theta_start = ((anglecut[0] % 360) * Math.PI) / 180;
        theta_length = (Math.min(anglecut[1], 360) * Math.PI) / 180;
      }
    }

    const segments = smoothness_segments;

    // Always create fill
    const fill_geometry = new THREE.CircleGeometry(
      radius,
      segments,
      theta_start,
      theta_length,
    );
    const fill_material = deps.template.materials.mesh_default.clone();
    if (color) fill_material.color = parse_color(color);
    if (opacity !== undefined) {
      fill_material.opacity = opacity;
      fill_material.transparent = opacity < 1;
    }
    fill_material.side = THREE.DoubleSide;
    const fill_mesh = new THREE.Mesh(fill_geometry, fill_material);

    let mesh: THREE.Mesh;

    if (outline !== undefined && outline > 0 && outline < radius) {
      // Also create outline ring at outer edge
      const inner_radius = radius - outline;
      const outline_geometry = new THREE.RingGeometry(
        inner_radius,
        radius,
        segments,
        1,
        theta_start,
        theta_length,
      );
      const outline_material = deps.template.materials.mesh_default.clone();
      if (color) outline_material.color = parse_color(color);
      outline_material.side = THREE.DoubleSide;
      const outline_mesh = new THREE.Mesh(outline_geometry, outline_material);

      // Group fill and outline together
      const group = new THREE.Group();
      group.add(fill_mesh);
      group.add(outline_mesh);
      mesh = fill_mesh; // Main mesh reference for position/rotation
      // Apply transforms to group instead
      group.position.copy(v3(snapped_center));

      const effective_dir = lookat ?? [0, 0, 1];
      const normal = v3(effective_dir).normalize();
      const up = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
      group.setRotationFromQuaternion(quaternion);

      if (spin) {
        const spinAxis = new THREE.Vector3(...normal);
        group.rotateOnWorldAxis(spinAxis, (spin * Math.PI) / 180);
      }

      if (stretch) {
        group.scale.set(stretch[0] ?? 1, stretch[1] ?? 1, stretch[2] ?? 1);
      }

      deps.template.root.add(group);
      group.userData = { id, selectable };

      deps.registry.add(
        {
          id,
          type: "circle",
        },
        selectable,
        null,
      );

      deps.registry.attach_mesh(id, group);
      return;
    }

    mesh = fill_mesh;

    mesh.position.copy(v3(snapped_center));

    const effective_dir = lookat ?? [0, 0, 1];
    const normal = v3(effective_dir).normalize();

    // CircleGeometry default: circle in XY plane, normal points +Z
    const up = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
    mesh.setRotationFromQuaternion(quaternion);

    // Spin applies AFTER lookat, around the direction axis (world space)
    if (spin) {
      const spinAxis = new THREE.Vector3(...normal);
      mesh.rotateOnWorldAxis(spinAxis, (spin * Math.PI) / 180);
    }

    if (stretch) {
      mesh.scale.set(stretch[0] ?? 1, stretch[1] ?? 1, stretch[2] ?? 1);
    }

    deps.template.root.add(mesh);
    mesh.userData = { id, selectable };

    deps.registry.add(
      {
        id,
        type: "circle",
      },
      selectable,
      null,
    );

    deps.registry.attach_mesh(id, mesh);
  };

  // 3D PRIMITIVES

  const sphere: SceneApi["sphere"] = ({
    id,
    position,
    offset,
    radius,
    stretch,
    anglecut,
    flatcut,
    lookat,
    spin = 0,
    color,
    opacity,
    selectable = true,
  }) => {
    // Apply grid snap to position and offset
    const base = get_snapped_center(position);
    const snapped_offset = get_snapped_center(offset);
    const snapped_center: Vec3 = [
      base[0] + snapped_offset[0],
      base[1] + snapped_offset[1],
      base[2] + snapped_offset[2],
    ];

    // anglecut: [start, length] in degrees, sweeps around Y axis (poles)
    // Note: three.js SphereGeometry phiStart=0 starts at -X (not +X per docs), so we add π to match documented behavior
    let phi_start = Math.PI;
    let phi_length = Math.PI * 2;
    if (anglecut !== undefined) {
      if (typeof anglecut === "number") {
        phi_start = Math.PI;
        phi_length = (Math.min(anglecut, 360) * Math.PI) / 180;
      } else {
        const start = anglecut[0] ?? 0;
        const length = anglecut[1] ?? 360;
        phi_start = ((start % 360) * Math.PI) / 180 + Math.PI;
        phi_length = (Math.min(length, 360) * Math.PI) / 180;
      }
    }
    const is_anglecut = phi_length < Math.PI * 2;

    // flatcut: [start, length] in degrees, 180 = hemisphere (three.js default)
    let theta_start = 0;
    let theta_length = Math.PI;
    if (flatcut !== undefined) {
      if (typeof flatcut === "number") {
        theta_start = 0;
        theta_length = (Math.min(flatcut, 360) * Math.PI) / 180;
      } else {
        const start = flatcut[0] ?? 0;
        const length = flatcut[1] ?? 180;
        theta_start = ((start % 360) * Math.PI) / 180;
        theta_length = (Math.min(length, 360) * Math.PI) / 180;
      }
    }
    const is_flatcut = theta_length < Math.PI;

    const geometry = new THREE.SphereGeometry(
      radius,
      smoothness_segments,
      Math.max(8, smoothness_segments / 2),
      phi_start,
      phi_length,
      theta_start,
      theta_length,
    );
    const material = deps.template.materials.mesh_default.clone();

    if (color) material.color = parse_color(color);
    if (opacity !== undefined) {
      material.opacity = opacity;
      material.transparent = opacity < 1;
    }
    if (is_anglecut || is_flatcut) material.side = THREE.DoubleSide;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(v3(snapped_center));

    // lookat: orient sphere's local +Z toward target direction
    // Default [0, 0, 1] is identity - sphere already faces +Z, no rotation needed
    // Only apply rotation if lookat is explicitly specified AND different from +Z
    if (lookat !== undefined) {
      const normal = v3(lookat).normalize();
      const is_default = normal.x === 0 && normal.y === 0 && normal.z === 1;
      if (!is_default) {
        const up = new THREE.Vector3(0, 0, 1);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          up,
          normal,
        );
        mesh.setRotationFromQuaternion(quaternion);
      }
    }

    // Spin: rotate around local Z axis (the lookat direction)
    if (spin) {
      mesh.rotateOnAxis(new THREE.Vector3(0, 0, 1), (spin * Math.PI) / 180);
    }

    // Apply stretch if provided
    if (stretch) {
      mesh.scale.set(stretch[0] ?? 1, stretch[1] ?? 1, stretch[2] ?? 1);
    }

    deps.template.root.add(mesh);
    mesh.userData = { id, selectable };

    deps.registry.add(
      {
        id,
        type: "sphere",
      },
      selectable,
      null,
    );

    deps.registry.attach_mesh(id, mesh);
  };

  const cylinder: SceneApi["cylinder"] = ({
    id,
    position,
    height,
    radius,
    offset,
    anglecut,
    spin = 0,
    lookat,
    color,
    opacity,
    selectable = true,
  }) => {
    // Determine height: use provided, or infer from radius, or default to [1]
    let final_height: number[];
    if (height !== undefined) {
      if (typeof height === "number") {
        final_height = [Math.max(0.01, height)];
      } else {
        final_height = height.map((h) => Math.max(0.01, h));
      }
    } else if (radius !== undefined) {
      final_height = Array(
        (typeof radius === "number" ? 1 : radius.length) - 1,
      ).fill(1);
    } else {
      final_height = [1];
    }

    // Determine radius: use provided, or default to array of 1s
    let final_radius: number[];
    if (radius !== undefined) {
      final_radius = typeof radius === "number" ? [radius] : radius;
    } else {
      final_radius = Array(final_height.length + 1).fill(1);
    }

    const total_height = final_height.reduce((sum, h) => sum + h, 0);
    const max_radius = Math.max(...final_radius);

    // Calculate AABB center
    const aabb_min: Vec3 = [-max_radius, -total_height / 2, -max_radius];
    const aabb_max: Vec3 = [max_radius, total_height / 2, max_radius];
    const aabb_center: Vec3 = [
      (aabb_min[0] + aabb_max[0]) / 2,
      (aabb_min[1] + aabb_max[1]) / 2,
      (aabb_min[2] + aabb_max[2]) / 2,
    ];

    // Calculate final position: use provided position, or default to AABB center
    const snapped_offset = offset ? get_snapped_center(offset) : [0, 0, 0];
    let finalPos: Vec3;
    if (position) {
      const snapped_center = get_snapped_center(position);
      finalPos = [
        snapped_center[0] + snapped_offset[0],
        snapped_center[1] + snapped_offset[1],
        snapped_center[2] + snapped_offset[2],
      ];
    } else {
      finalPos = [
        aabb_center[0] + snapped_offset[0],
        aabb_center[1] + snapped_offset[1],
        aabb_center[2] + snapped_offset[2],
      ];
    }

    const group = new THREE.Group();

    // anglecut: [start, length] in degrees, starts at +X (three.js cylinder starts at +Z, so add 90°)
    let theta_start = Math.PI / 2; // +90 degrees in radians = +X
    let theta_length = Math.PI * 2;
    if (anglecut !== undefined) {
      if (typeof anglecut === "number") {
        theta_start = Math.PI / 2;
        theta_length = (Math.min(anglecut, 360) * Math.PI) / 180;
      } else {
        theta_start = (((anglecut[0] % 360) + 90) * Math.PI) / 180;
        theta_length = (Math.min(anglecut[1] ?? 360, 360) * Math.PI) / 180;
      }
    }
    const is_sliced = theta_length < Math.PI * 2;

    let current_y = -total_height / 2;

    for (let i = 0; i < final_height.length; i++) {
      const height = final_height[i];
      const radius_bottom = final_radius[i];
      const radius_top = final_radius[i + 1];

      const cylinder_geometry = new THREE.CylinderGeometry(
        radius_top,
        radius_bottom,
        height,
        smoothness_segments,
        1,
        false,
        theta_start,
        theta_length,
      );

      const material = deps.template.materials.mesh_default.clone();
      if (color) material.color = parse_color(color);
      if (opacity !== undefined) {
        material.opacity = opacity;
        material.transparent = opacity < 1;
      }
      if (is_sliced) material.side = THREE.DoubleSide;

      const cylinder = new THREE.Mesh(cylinder_geometry, material);

      const mid_y = current_y + height / 2;
      cylinder.position.set(0, mid_y, 0);

      group.add(cylinder);

      current_y += height;
    }

    group.position.set(finalPos[0], finalPos[1], finalPos[2]);

    const look_dir = lookat
      ? v3(lookat).normalize()
      : new THREE.Vector3(0, 1, 0);
    if (look_dir.lengthSq() > 0.0001) {
      const y_axis = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        y_axis,
        look_dir,
      );
      group.setRotationFromQuaternion(quaternion);
    }

    if (spin) {
      group.rotateY((spin * Math.PI) / 180);
    }

    deps.template.root.add(group);
    group.userData = { id, selectable };

    deps.registry.add(
      {
        id,
        type: "cylinder",
      },
      selectable,
      null,
    );

    deps.registry.attach_mesh(id, group);
  };

  const poly3: SceneApi["poly3"] = ({
    id,
    points,
    position,
    offset,
    color,
    opacity,
    lookat,
    spin = 0,
    selectable = true,
  }) => {
    if (points.length < 4) {
      throw new Error("poly3 requires at least 4 points");
    }

    // Apply offset (no snapping - preserves local shape composition)
    const final_points = offset
      ? points.map((p) => [
          (p[0] ?? 0) + (offset[0] ?? 0),
          (p[1] ?? 0) + (offset[1] ?? 0),
          (p[2] ?? 0) + (offset[2] ?? 0),
        ])
      : points.map((p) => [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0]);

    if (grid_enabled && grid_size > 0) {
    }

    const aabb_min = [
      Math.min(...final_points.map((p) => p[0])),
      Math.min(...final_points.map((p) => p[1])),
      Math.min(...final_points.map((p) => p[2])),
    ];
    const aabb_max = [
      Math.max(...final_points.map((p) => p[0])),
      Math.max(...final_points.map((p) => p[1])),
      Math.max(...final_points.map((p) => p[2])),
    ];
    const aabb_center = [
      (aabb_min[0] + aabb_max[0]) / 2,
      (aabb_min[1] + aabb_max[1]) / 2,
      (aabb_min[2] + aabb_max[2]) / 2,
    ];

    const centered_points = final_points.map((p) => [
      p[0] - aabb_center[0],
      p[1] - aabb_center[1],
      p[2] - aabb_center[2],
    ]);

    const three_points = centered_points.map(
      (p) => new THREE.Vector3(p[0], p[1], p[2]),
    );
    const convex_geometry = new ConvexGeometry(three_points);

    const material = deps.template.materials.mesh_default.clone();
    if (color) material.color = parse_color(color);
    if (opacity !== undefined) {
      material.opacity = opacity;
      material.transparent = opacity < 1;
    }
    material.side = THREE.DoubleSide;

    const mesh = new THREE.Mesh(convex_geometry, material);

    // If position provided, use it (will snap); otherwise use calculated center (no snap)
    let finalPos: Vec3;
    if (position) {
      finalPos = [position[0] ?? 0, position[1] ?? 0, position[2] ?? 0];
    } else {
      finalPos = [...aabb_center];
    }

    // Apply lookat (rotation)
    const effective_lookat = lookat ?? [0, 0, 1];
    const look_dir = v3(effective_lookat).normalize();
    const default_facing = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      default_facing,
      look_dir,
    );
    mesh.setRotationFromQuaternion(quaternion);

    // Apply spin (rotation)
    if (spin) {
      const spinAxis = new THREE.Vector3(look_dir.x, look_dir.y, look_dir.z);
      mesh.rotateOnWorldAxis(spinAxis, (spin * Math.PI) / 180);
    }

    // Snap final position if explicitly provided
    if (grid_enabled && grid_size > 0 && position) {
      finalPos = [
        snap_to_grid(finalPos[0], grid_size),
        snap_to_grid(finalPos[1], grid_size),
        snap_to_grid(finalPos[2], grid_size),
      ];
    } else if (grid_enabled && grid_size > 0) {
    }

    mesh.position.set(finalPos[0], finalPos[1], finalPos[2]);

    deps.template.root.add(mesh);
    mesh.userData = { id, selectable };

    deps.registry.add(
      {
        id,
        type: "poly3",
      },
      selectable,
      null,
    );

    deps.registry.attach_mesh(id, mesh);
  };

  const donut: SceneApi["donut"] = ({
    id,
    position,
    offset,
    radius,
    thickness,
    lookat,
    anglecut,
    spin = 0,
    color,
    opacity,
    selectable = true,
  }) => {
    // Apply grid snap to position and offset
    const base = get_snapped_center(position);
    const snapped_offset = get_snapped_center(offset);
    const snapped_center: Vec3 = [
      base[0] + snapped_offset[0],
      base[1] + snapped_offset[1],
      base[2] + snapped_offset[2],
    ];

    // anglecut: [thetaStart, thetaLength] in degrees, or single number = thetaLength from 0
    // Note: TorusGeometry only supports arc (length), not start angle. Start angle is handled via rotation.
    let theta_start = 0;
    let theta_length = Math.PI * 2;
    if (anglecut !== undefined) {
      if (typeof anglecut === "number") {
        theta_start = 0;
        theta_length = (Math.min(anglecut, 360) * Math.PI) / 180;
      } else {
        theta_start = (anglecut[0] * Math.PI) / 180;
        theta_length = (Math.min(anglecut[1], 360) * Math.PI) / 180;
      }
    }

    const is_sliced = theta_length < Math.PI * 2;
    const geometry = new THREE.TorusGeometry(
      radius,
      thickness,
      Math.max(8, smoothness_segments / 4),
      smoothness_segments,
      theta_length,
    );
    const material = deps.template.materials.mesh_default.clone();

    if (color) material.color = parse_color(color);
    if (opacity !== undefined) {
      material.opacity = opacity;
      material.transparent = opacity < 1;
    }
    if (is_sliced) material.side = THREE.DoubleSide;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(v3(snapped_center));

    // Apply lookat - TorusGeometry default has Z+ as axis
    const effective_dir = lookat ?? [0, 0, 1];
    const normal = v3(effective_dir).normalize();
    const up = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
    mesh.setRotationFromQuaternion(quaternion);

    // Apply start angle rotation around the torus axis (after lookat orientation)
    if (theta_start !== 0) {
      mesh.rotateOnWorldAxis(normal, theta_start);
    }

    // Spin applies AFTER lookat, around the direction axis (world space)
    if (spin) {
      const spinAxis = new THREE.Vector3(...normal);
      mesh.rotateOnWorldAxis(spinAxis, (spin * Math.PI) / 180);
    }

    deps.template.root.add(mesh);
    mesh.userData = { id, selectable };

    deps.registry.add(
      {
        id,
        type: "donut",
      },
      selectable,
      null,
    );

    deps.registry.attach_mesh(id, mesh);
  };

  // INFRASTRUCTURE

  const axes: SceneApi["axes"] = ({
    id = "axes",
    x,
    y,
    z,
    position,
    selectable = false,
  } = {}) => {
    const default_axes = deps.template.scene.getObjectByName(DEFAULT_AXES_ID);
    if (default_axes) {
      deps.template.scene.remove(default_axes);
    }

    const snapped_position = position
      ? get_snapped_center(position)
      : undefined;
    const axes = create_axes_group({
      x,
      y,
      z,
      position: snapped_position,
    });
    deps.template.root.add(axes);
    axes.userData = { id, selectable };

    deps.registry.add(
      {
        id,
        type: "axes",
      },
      selectable,
      null,
    );
  };

  const label: SceneApi["label"] = ({
    id,
    text,
    position,
    color,
    fontSizePx,
    selectable = true,
  }) => {
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
      (label.element as HTMLElement).style.fontSize =
        `${LABEL_STYLE.font_size_px}px`;
    }

    deps.template.root.add(label);
    label.userData = { id, selectable };

    deps.registry.add(
      {
        id,
        type: "label",
      },
      selectable,
      null,
    );

    deps.registry.attach_mesh(id, label);
  };

  const group: SceneApi["group"] = ({
    id,
    children,
    lookat,
    spin = 0,
    offset,
    selectable = true,
  }) => {
    const group = new THREE.Group();

    const combinedBox = new THREE.Box3();

    children.forEach((child_id) => {
      const child = deps.registry.get_mesh(child_id);
      if (child) {
        const childBox = new THREE.Box3().setFromObject(child);
        combinedBox.union(childBox);
      }
    });

    const center = combinedBox.getCenter(new THREE.Vector3());
    const centerX = center.x;
    const centerY = center.y;
    const centerZ = center.z;

    group.position.set(centerX, centerY, centerZ);

    children.forEach((child_id) => {
      const child = deps.registry.get_mesh(child_id);
      if (child) {
        group.attach(child);
      }
    });

    // Apply offset (don't snap yet)
    if (offset) {
      group.position.x += offset[0] ?? 0;
      group.position.y += offset[1] ?? 0;
      group.position.z += offset[2] ?? 0;
    }

    // Apply lookat
    const effective_dir = lookat ?? [0, 0, 1];
    const normal = v3(effective_dir).normalize();
    const up = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
    group.applyQuaternion(quaternion);

    // Spin applies AFTER lookat, around the lookat axis (world space)
    if (spin) {
      const spinAxis = new THREE.Vector3(...normal);
      group.rotateOnWorldAxis(spinAxis, (spin * Math.PI) / 180);
    }

    // Snap final position after all transforms
    if (grid_enabled && grid_size > 0) {
      group.position.x = snap_to_grid(group.position.x, grid_size);
      group.position.y = snap_to_grid(group.position.y, grid_size);
      group.position.z = snap_to_grid(group.position.z, grid_size);
    }

    deps.template.root.add(group);
    group.userData = { id, selectable };

    deps.registry.add(
      {
        id,
        type: "group",
      },
      selectable,
      null,
    );

    deps.registry.attach_mesh(id, group);

    children.forEach((child_id) => {
      const child = deps.registry.get_mesh(child_id);
      if (child) {
        deps.registry.set_parent(child_id, id);
      }
    });
  };

  const animation: SceneApi["animation"] = ({ id, updateFunction }) => {
    try {
      const fn = new Function(
        "elapsed",
        "scene",
        "THREE",
        updateFunction,
      ) as AnimationFn;

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
    } else {
    }
  };

  const mesh: SceneApi["mesh"] = ({
    id,
    createFn,
    position,
    offset,
    color,
    lookat,
    spin = 0,
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

    const base = get_snapped_center(position);
    const snapped_offset = get_snapped_center(offset);
    mesh.position.set(
      base[0] + snapped_offset[0],
      base[1] + snapped_offset[1],
      base[2] + snapped_offset[2],
    );

    // Apply lookat and spin
    const effective_lookat = lookat ?? [0, 0, 1];
    const normal = v3(effective_lookat).normalize();
    const up = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
    mesh.setRotationFromQuaternion(quaternion);

    // Spin applies AFTER lookat, around the lookat axis (world space)
    if (spin) {
      const spinAxis = new THREE.Vector3(...normal);
      mesh.rotateOnWorldAxis(spinAxis, (spin * Math.PI) / 180);
    }

    deps.template.root.add(mesh);
    mesh.userData = { id, selectable };

    deps.registry.add(
      {
        id,
        type: "custom",
      },
      selectable,
      null,
    );

    deps.registry.attach_mesh(id, mesh);
  };

  const tooltip: SceneApi["tooltip"] = ({ id, title, properties }) => {
    const props = typeof properties === "string" 
      ? properties.split(",").map((p) => ({ label: p.trim(), value: "" }))
      : properties;
    deps.registry.register_hover(id, { title, properties: props });
  };

  const grid: SceneApi["grid"] = (size) => {
    grid_size = size;
  };

  const smoothness: SceneApi["smoothness"] = (segments) => {
    // Set the number of segments for curved shapes (32=low, 64=default, 128=high)
    smoothness_segments = Math.max(8, Math.min(256, segments));
  };

  const camera: SceneApi["camera"] = ({ position, lookat }) => {
    camera_was_set = true;
    if (position) {
      deps.template.camera.position.set(position[0], position[1], position[2]);
    }
    const lookatVec = lookat ?? [0, 0, 0];
    deps.template.controls.target.set(lookatVec[0], lookatVec[1], lookatVec[2]);
    deps.template.controls.update();
  };

  // Expose camera_was_set for external checking
  const get_camera_was_set = () => camera_was_set;

  const getObject: SceneApi["getObject"] = (id) => {
    return deps.registry.get_mesh(id);
  };

  const listObjects: SceneApi["listObjects"] = () => {
    return deps.registry.list();
  };

  const api: SceneApi = {
    // 2D Primitives
    point,
    line,
    curve,
    poly2,
    circle,

    // 3D Primitives
    sphere,
    cylinder,
    poly3,
    donut,

    // Infrastructure
    axes,
    label,
    group,
    animation,
    mesh,
    tooltip,
    grid,
    smoothness,
    camera,
    getObject,
    listObjects,
  };

  const cancel_animation = () => {
    if (animation_frame_id !== null) {
      cancelAnimationFrame(animation_frame_id);
      animation_frame_id = null;
    }
    animations.clear();
  };

  const reset = () => {
    cancel_animation();
    camera_was_set = false;
    smoothness_segments = 64;
    grid_size = deps.gridConfig?.size ?? 0.5;
  };

  return {
    api,
    get_camera_was_set,
    get_animation_frame_id: () => animation_frame_id,
    cancel_animation,
    reset,
  };
}
