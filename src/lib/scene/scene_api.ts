import * as THREE from "three";
import renderMathInElement from "katex/contrib/auto-render";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

import { create_axes_group } from "@/lib/scene/axes";
import { apply_label_style, LABEL_STYLE } from "@/lib/three/labels";
import type { ThreeBaseTemplate } from "@/lib/three/base_template";
import { ObjectRegistry } from "@/lib/scene/object_registry";
import type { SceneApi, Vec3 } from "@/lib/scene/types";

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

function v3(p: Vec3): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.y, p.z);
}

function snap_to_grid(value: number, size: number): number {
  if (size <= 0) return value;
  return Math.round(value / size) * size;
}

function snap_vec3(v: Vec3 | undefined, size: number): Vec3 | undefined {
  if (!v) return v;
  return {
    x: snap_to_grid(v.x, size),
    y: snap_to_grid(v.y, size),
    z: snap_to_grid(v.z, size),
  };
}

function snap_points(points: Vec3[], size: number): Vec3[] {
  if (size <= 0) return points;
  return points.map((p) => snap_vec3(p, size)!);
}

type SliceInput = { start: number; end: number } | number;

function normalize_slice(slice: SliceInput | undefined): { start: number; end: number } | undefined {
  if (slice === undefined) return undefined;
  if (typeof slice === "number") {
    return { start: 0, end: slice };
  }
  return slice;
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

  function get_snapped_center(center: Vec3): Vec3 {
    return snap_vec3(center, grid_enabled ? grid_size : 0)!;
  }

  function get_snapped_points(points: Vec3[]): Vec3[] {
    return snap_points(points, grid_enabled ? grid_size : 0);
  }

  // 2D PRIMITIVES

  const addPoint: SceneApi["addPoint"] = ({
    id,
    center,
    color,
    selectable = true,
  }) => {
    const geometry = new THREE.SphereGeometry(0.05, 16, 12);
    const material = deps.template.materials.mesh_default.clone();

    if (color) {
      material.color = new THREE.Color(color);
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(v3(get_snapped_center(center)));
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
    color,
    opacity,
    selectable = true,
  }) => {
    let point_array: Vec3[];

    // Handle formula expression
    if (typeof points === "object" && "tMin" in points) {
      point_array = [];
      const { x: xExpr, y: yExpr, z: zExpr, tMin, tMax, tSteps } = points;
      
      for (let i = 0; i < tSteps; i++) {
        const t = tMin + (tMax - tMin) * (i / (tSteps - 1));
        const x = new Function("t", `return ${xExpr}`)(t);
        const y = new Function("t", `return ${yExpr}`)(t);
        const z = new Function("t", `return ${zExpr}`)(t);
        point_array.push({ x, y, z });
      }
    } else {
      point_array = points as Vec3[];
    }

    // Only snap if points are fixed coordinates (not from formula)
    const should_snap = grid_enabled && grid_size > 0 && typeof points !== "object";
    if (should_snap) {
      point_array = get_snapped_points(point_array);
    }

    const curve_points = point_array.map((p) => v3(p));
    const curve = new THREE.CatmullRomCurve3(curve_points);
    
    let mesh: THREE.Object3D;

    if (thickness > 0) {
      // Tube geometry
      const tube_geometry = new THREE.TubeGeometry(curve, Math.max(1, curve_points.length - 1), thickness, 8, false);
      
      const material = deps.template.materials.mesh_default.clone();
      if (color) material.color = new THREE.Color(color);
      if (opacity !== undefined) material.opacity = opacity;

      mesh = new THREE.Mesh(tube_geometry, material);
    } else {
      // Thin line
      const geometry = new THREE.BufferGeometry().setFromPoints(curve_points);
      const material = deps.template.materials.line_default.clone();
      if (color) material.color = new THREE.Color(color);
      
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
      if (color) arrow_material.color = new THREE.Color(color);
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
    color,
    opacity,
    direction,
    rotation = 0,
    selectable = true,
  }) => {
    // Apply grid snap to points
    const snapped_points = get_snapped_points(points);

    const shape = new THREE.Shape();
    shape.moveTo(snapped_points[0].x, snapped_points[0].z);

    for (let i = 1; i < snapped_points.length; i++) {
      shape.lineTo(snapped_points[i].x, snapped_points[i].z);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    const material = deps.template.materials.mesh_default.clone();
    material.side = THREE.DoubleSide;

    if (color) material.color = new THREE.Color(color);
    if (opacity !== undefined) {
      material.opacity = opacity;
      material.transparent = opacity < 1;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = snapped_points[0].y;

    mesh.rotation.x = Math.PI / 2;

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
      type: "poly2d",
    }, selectable, null);

    deps.registry.attach_mesh(id, mesh);
  };

  const addCircle: SceneApi["addCircle"] = ({
    id,
    center,
    radius,
    direction = { x: 0, y: 0, z: 1 },
    stretch,
    slice,
    rotation = 0,
    color,
    opacity,
    selectable = true,
  }) => {
    // Apply grid snap to center
    const snapped_center = get_snapped_center(center);

    const norm = normalize_slice(slice);
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
        if (color) material.color = new THREE.Color(color);
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
        if (color) material.color = new THREE.Color(color);

        const line = new THREE.Line(lineGeometry, material);
        mesh = new THREE.Mesh(lineGeometry, material);
        mesh.add(line);
      }
    } else {
      const geometry = new THREE.CircleGeometry(radius, 64, theta_start, theta_length);
      const material = deps.template.materials.mesh_default.clone();
      if (color) material.color = new THREE.Color(color);
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
      mesh.scale.set(stretch.x, stretch.y, stretch.z);
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
    radius,
    stretch,
    slice,
    direction = { x: 0, y: 0, z: 1 },
    rotation = 0,
    color,
    opacity,
    selectable = true,
  }) => {
    // Apply grid snap to center
    const snapped_center = get_snapped_center(center);

    const norm = normalize_slice(slice);
    const phi_start = norm ? (norm.start * Math.PI) / 180 : 0;
    const phi_length = norm ? ((norm.end - norm.start) * Math.PI) / 180 : Math.PI;

    const geometry = new THREE.SphereGeometry(radius, smoothness, Math.max(8, smoothness / 2), 0, Math.PI * 2, phi_start, phi_length);
    const material = deps.template.materials.mesh_default.clone();
    
    if (color) material.color = new THREE.Color(color);
    if (opacity !== undefined) {
      material.opacity = opacity;
      material.transparent = opacity < 1;
    }

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
      mesh.scale.set(stretch.x, stretch.y, stretch.z);
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
    radius,
    slice,
    direction,
    rotation = 0,
    color,
    opacity,
    selectable = true,
  }) => {
    // Apply grid snap to points
    const snapped_points = get_snapped_points(points);

    // Simplified approach: create separate cylinders for each segment
    const group = new THREE.Group();

    const norm = normalize_slice(slice);
    const theta_start = norm ? (norm.start * Math.PI) / 180 : 0;
    const theta_length = norm ? ((norm.end - norm.start) * Math.PI) / 180 : Math.PI * 2;

    for (let i = 0; i < snapped_points.length - 1; i++) {
      const start = v3(snapped_points[i]);
      const end = v3(snapped_points[i + 1]);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const height = start.distanceTo(end);

      const cylinder_geometry = new THREE.CylinderGeometry(radius[i + 1], radius[i], height, smoothness, 1, false, theta_start, theta_length);
      const material = deps.template.materials.mesh_default.clone();

      if (color) material.color = new THREE.Color(color);
      if (opacity !== undefined) {
        material.opacity = opacity;
        material.transparent = opacity < 1;
      }

      const cylinder = new THREE.Mesh(cylinder_geometry, material);
      cylinder.position.copy(mid);
      cylinder.lookAt(end);
      cylinder.rotateX(Math.PI / 2);

      group.add(cylinder);
    }

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
    color,
    opacity,
    direction,
    rotation = 0,
    selectable = true,
  }) => {
    // Apply grid snap to points
    const snapped_points = get_snapped_points(points);

    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];

    const yValues = snapped_points.map((p) => p.y);
    const tolerance = 0.01;

    const basePoints: typeof snapped_points = [];
    const apexPoints: typeof snapped_points = [];

    const minY = Math.min(...yValues);
    for (let i = 0; i < snapped_points.length; i++) {
      if (Math.abs(snapped_points[i].y - minY) < tolerance) {
        basePoints.push(snapped_points[i]);
      } else {
        apexPoints.push(snapped_points[i]);
      }
    }

    const is_convex_polyhedron = basePoints.length >= 3;

    if (is_convex_polyhedron && apexPoints.length > 0) {
      const add_triangle = (p1: typeof points[0], p2: typeof points[0], p3: typeof points[0]) => {
        vertices.push(
          p1.x, p1.y, p1.z,
          p3.x, p3.y, p3.z,
          p2.x, p2.y, p2.z
        );
      };

      const triangulate_polygon = (polygon: typeof points) => {
        const n = polygon.length;
        if (n < 3) return;
        if (n === 3) {
          add_triangle(polygon[0], polygon[1], polygon[2]);
          return;
        }

        const center = {
          x: polygon.reduce((s, p) => s + p.x, 0) / n,
          y: polygon.reduce((s, p) => s + p.y, 0) / n,
          z: polygon.reduce((s, p) => s + p.z, 0) / n,
        };

        for (let i = 0; i < n; i++) {
          const next = (i + 1) % n;
          add_triangle(polygon[i], polygon[next], center);
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
      const centroid = new THREE.Vector3();
      const three_points = snapped_points.map((p) => {
        const v = v3(p);
        centroid.add(v);
        return v;
      });
      centroid.divideScalar(snapped_points.length);

      for (let i = 0; i < three_points.length; i++) {
        const next = (i + 1) % three_points.length;
        vertices.push(
          centroid.x, centroid.y, centroid.z,
          three_points[i].x, three_points[i].y, three_points[i].z,
          three_points[next].x, three_points[next].y, three_points[next].z
        );
      }
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const material = deps.template.materials.mesh_default.clone();
    if (color) material.color = new THREE.Color(color);
    if (opacity !== undefined) {
      material.opacity = opacity;
      material.transparent = opacity < 1;
    }

    const mesh = new THREE.Mesh(geometry, material);

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
    radius,
    thickness,
    direction = { x: 0, y: 0, z: 1 },
    slice,
    rotation = 0,
    color,
    opacity,
    selectable = true,
  }) => {
    // Apply grid snap to center
    const snapped_center = get_snapped_center(center);

    const norm = normalize_slice(slice);
    const arc = norm ? ((norm.end - norm.start) * Math.PI) / 180 : Math.PI * 2;
    const geometry = new THREE.TorusGeometry(radius, thickness, Math.max(8, smoothness / 4), smoothness, arc);
    const material = deps.template.materials.mesh_default.clone();
    
    if (color) material.color = new THREE.Color(color);
    if (opacity !== undefined) {
      material.opacity = opacity;
      material.transparent = opacity < 1;
    }

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
    // Apply grid snap to position if provided
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
    selectable = true,
  }) => {
    const group = new THREE.Group();

    // Update registry to mark children as having this group as parent
    children.forEach((child_id) => {
      const child = deps.registry.get_mesh(child_id);
      if (child) {
        group.add(child);
      }
      // Set parent reference in registry
      deps.registry.set_parent(child_id, id);
    });

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
      type: "group",
    }, selectable, null);

    deps.registry.attach_mesh(id, group);
  };

  const addAnimation: SceneApi["addAnimation"] = ({ id, updateFunction }) => {
    const fn = new Function("elapsed", "scene", "THREE", updateFunction) as AnimationFn;

    animations.set(id, {
      fn,
      startTime: performance.now(),
    });

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
    color,
    direction,
    rotation = 0,
    selectable = true,
  }) => {
    const fn = new Function("THREE", createFn);
    const mesh = fn(THREE) as THREE.Mesh;

    if (!mesh) {
      throw new Error(`Custom mesh "${id}" did not return a mesh`);
    }

    if (color && mesh.material) {
      const material = (mesh.material as THREE.Material).clone();
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color = new THREE.Color(color);
      }
      mesh.material = material;
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
