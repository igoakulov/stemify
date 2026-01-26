import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

import { create_axes_group } from "@/lib/scene/axes";
import { create_polyline } from "@/lib/scene/curve";
import { create_vector_group } from "@/lib/scene/vector";
import { apply_label_style, LABEL_STYLE } from "@/lib/three/labels";
import type { ThreeBaseTemplate } from "@/lib/three/base_template";
import { ObjectRegistry } from "@/lib/scene/object_registry";
import type { SceneApi, Vec3 } from "@/lib/scene/types";

type SceneApiDeps = {
  template: ThreeBaseTemplate;
  registry: ObjectRegistry;
};

function v3(p: Vec3): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.y, p.z);
}

export function create_scene_api(deps: SceneApiDeps): SceneApi {
  const addAxes: SceneApi["addAxes"] = ({
    id = "axes",
    length,
    position,
    description,
  } = {}) => {
    const axes = create_axes_group({ length, position });
    deps.template.root.add(axes);

    deps.registry.add({
      id,
      type: "axes",
      description: description ?? "Axes",
    });
  };

  const addLabel: SceneApi["addLabel"] = ({ id, text, position, color, fontSizePx }) => {
    const div = document.createElement("div");
    div.textContent = text;

    const label = new CSS2DObject(div);
    label.position.copy(v3(position));

    apply_label_style(label);

    if (color) {
      (label.element as HTMLElement).style.color = color;
    }

    if (fontSizePx) {
      (label.element as HTMLElement).style.fontSize = `${fontSizePx}px`;
    } else {
      (label.element as HTMLElement).style.fontSize = `${LABEL_STYLE.font_size_px}px`;
    }

    deps.template.root.add(label);

    deps.registry.add({
      id,
      type: "label",
      description: `Label: ${text}`,
    });

    deps.registry.attach_mesh(id, label);
  };

  const addCurve: SceneApi["addCurve"] = ({
    id,
    points,
    color,
    dashed,
    description,
  }) => {
    const line = create_polyline({ points, color, dashed });
    deps.template.root.add(line);

    deps.registry.add({
      id,
      type: "curve",
      description: description ?? "Curve",
    });

    deps.registry.attach_mesh(id, line);
  };

  const addShape: SceneApi["addShape"] = ({
    id,
    type,
    position,
    color,
    size = 1,
    description,
  }) => {
    let geometry: THREE.BufferGeometry;

    if (type === "cube") {
      geometry = new THREE.BoxGeometry(size, size, size);
    } else {
      geometry = new THREE.SphereGeometry(size / 2, 24, 16);
    }

    const material = deps.template.materials.mesh_default.clone();

    if (color) {
      material.color = new THREE.Color(color);
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(v3(position));
    deps.template.root.add(mesh);

    deps.registry.add({
      id,
      type,
      description: description ?? `${type} @ (${position.x}, ${position.y}, ${position.z})`,
    });

    deps.registry.attach_mesh(id, mesh);
  };

  const addVector: SceneApi["addVector"] = ({ id, from, to, color, description }) => {
    const group = create_vector_group({ from, to, color });
    deps.template.root.add(group);

    deps.registry.add({
      id,
      type: "vector",
      description: description ?? "Vector",
    });

    deps.registry.attach_mesh(id, group);
  };

  const registerHover: SceneApi["registerHover"] = ({ id, title, properties }) => {
    deps.registry.register_hover(id, { title, properties });
  };

  const listObjects: SceneApi["listObjects"] = () => {
    return deps.registry.list();
  };

  return { addAxes, addLabel, addCurve, addShape, addVector, registerHover, listObjects };
}
