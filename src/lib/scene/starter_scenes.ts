import type { SavedScene } from "@/lib/scene/store";

export function get_starter_scenes(): SavedScene[] {
  const now = Date.now();

  return [
    {
      id: "starter_shapes",
      title: "Starter: Shapes",
      createdAt: now,
      updatedAt: now,
      sceneCode: `
scene.setSmoothness(128);
scene.setGrid(0.5);

scene.addAxes({
  id: "axes",
  x: { start: -7, end: 7 },
  y: { end: 5 },
  z: { start: -7, end: 7 }
});

scene.addPoly2({
  id: "house_body",
  points: [
    { x: -4, y: 0, z: 3 },
    { x: -4, y: 0, z: 4 },
    { x: -2, y: 0, z: 4 },
    { x: -2, y: 0, z: 3 }
  ],
  color: "#B07CFF",
  opacity: 0.5
});

scene.addPoly2D({
  id: "house_roof",
  points: [
    { x: -4, y: 0, z: 3 },
    { x: -2, y: 0, z: 3 },
    { x: -3, y: 0, z: 2 }
  ],
  color: "#F25C54",
  opacity: 0.6
});

scene.addGroup({
  id: "house",
  children: ["house_body", "house_roof"],
});

scene.addPoly2D({
  id: "car_lower",
  points: [
    { x: -6.5, y: 0, z: 6.5 },
    { x: -6.5, y: 0, z: 6 },
    { x: -3.5, y: 0, z: 6 },
    { x: -3.5, y: 0, z: 6.5 }
  ],
  color: "#EF4444"
});

scene.addPoly2D({
  id: "car_upper",
  points: [
    { x: -6, y: 0, z: 6 },
    { x: -5.5, y: 0, z: 5.5 },
    { x: -5, y: 0, z: 5.5 },
    { x: -4.5, y: 0, z: 6 }
  ],
  color: "#EF4444"
});

scene.addCircle({
  id: "wheel_back",
  center: { x: -6, y: 0.05, z: 6.5 },
  radius: 0.25,
  direction: { x: 0, y: 1, z: 0 },
  color: "#E6E8EB"
});

scene.addCircle({
  id: "wheel_front",
  center: { x: -4, y: 0.05, z: 6.5 },
  radius: 0.25,
  direction: { x: 0, y: 1, z: 0 },
  color: "#E6E8EB"
});

scene.addGroup({
  id: "car",
  children: ["car_lower", "car_upper", "wheel_back", "wheel_front"],
});

scene.addPoly2D({
  id: "triangle",
  points: [
    { x: -4, y: 0, z: -2 },
    { x: -2, y: 0, z: -2 },
    { x: -2, y: 0, z: -4 }
  ],
  color: "#2FBF71"
});

scene.addCircle({
  id: "disc",
  center: { x: -6, y: 0.01, z: -6 },
  radius: 1,
  direction: { x: 0, y: 1, z: 0 },
  color: "#2D7FF9"
});

scene.addCircle({
  id: "ring",
  center: { x: -6, y: 0, z: -3 },
  radius: 1,
  opacity: 0,
  direction: { x: 0, y: 1, z: 0 },
  color: "#B07CFF"
});

scene.addLine({
  id: "wavy_line",
  points: {
    x: "-4 + t * 2",
    y: "0.01",
    z: "-6 + 0.5 * Math.sin(t * 12.56)",
    tMin: 0,
    tMax: 1,
    tSteps: 50
  },
  thickness: 0.05,
  color: "#F2C14E"
});

scene.addSphere({
  id: "sphere",
  center: { x: 3, y: 1, z: -6 },
  radius: 1,
  color: "#F25C54"
});

scene.addCylinder({
  id: "hourglass",
  points: [
    { x: 6, y: 0.01, z: -6 },
    { x: 6, y: 1, z: -6 },
    { x: 6, y: 2, z: -6 }
  ],
  radius: [0.5, 0.05, 0.5],
  color: "#E6E8EB"
});

scene.addCylinder({
  id: "cone",
  points: [{ x: 3, y: 0.01, z: -3 }, { x: 3, y: 2, z: -3 }],
  radius: [1, 0],
  color: "#2D7FF9"
});

scene.addPoly3D({
  id: "pyramid",
  points: [
    { x: 5, y: 0, z: -4 },
    { x: 7, y: 0, z: -4 },
    { x: 7, y: 0, z: -2 },
    { x: 5, y: 0, z: -2 },
    { x: 6, y: 1.5, z: -3 }
  ],
  color: "#8b5cf6"
});

scene.addSphere({
  id: "saturn_planet",
  center: { x: 3, y: 1, z: 3 },
  radius: 0.8,
  color: "#F2C14E"
});

scene.addDonut({
  id: "saturn_rings",
  center: { x: 3, y: 1, z: 3 },
  radius: 1.4,
  thickness: 0.2,
  direction: { x: 0.3, y: 1, z: 0 },
  color: "#E6E8EB",
  opacity: 0.7
});

scene.addGroup({
  id: "saturn",
  children: ["saturn_planet", "saturn_rings"],
});

scene.addCustomMesh({
  id: "icosahedron",
  createFn: \`
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0xB07CFF,
      roughness: 0.3,
      flatShading: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(6, 1, 6);
    return mesh;
  \`
});

scene.addCustomMesh({
  id: "torus_knot",
  createFn: \`
    const geometry = new THREE.TorusKnotGeometry(0.6, 0.25, 100, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2FBF71,
      roughness: 0.4
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(6, 1, 3);
    return mesh;
  \`
});

scene.addAnimation({
  id: "rotate_shapes",
  updateFunction: \`
    const torusKnot = scene.getObject("torus_knot");
    const icosahedron = scene.getObject("icosahedron");

    if (torusKnot) {
      torusKnot.rotation.y = elapsed * 0.5;
      torusKnot.rotation.x = elapsed * 0.2;
    }
    if (icosahedron) {
      icosahedron.rotation.y = elapsed * 0.3;
      icosahedron.rotation.x = elapsed * 0.1;
    }
  \`
});

scene.addAnimation({
  id: "appear",
  updateFunction: \`
    const t = Math.min(elapsed / 1.0, 1);
    const scale = 1 - Math.pow(1 - t, 3);

    const directObjects = [
      "triangle", "disc", "ring", "wavy_line",
      "sphere", "pyramid", "icosahedron", "torus_knot"
    ];

    const groups = [
      "car", "house", "saturn", "hourglass", "cone"
    ];

    directObjects.forEach(id => {
      const obj = scene.getObject(id);
      if (obj) obj.scale.set(scale, scale, scale);
    });

    groups.forEach(id => {
      const obj = scene.getObject(id);
      if (obj) obj.scale.set(scale, scale, scale);
    });
  \`
});
`,
    },
    {
      id: "starter_vectors",
      title: "Starter: Vectors",
      createdAt: now,
      updatedAt: now,
      sceneCode: `
scene.addAxes({ id: "axes", length: 5 });
scene.setGrid(0.5);

scene.addLine({
  id: "v1",
  points: [{ x: 0, y: 0, z: 0 }, { x: 2, y: 1.1, z: 1.4 }],
  thickness: 0.04,
  arrow: "end",
  color: "#F25C54"
});

scene.addLine({
  id: "v2",
  points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 1.9, z: 0.4 }],
  thickness: 0.04,
  arrow: "end",
  color: "#2D7FF9"
});

scene.addLine({
  id: "v_sum",
  points: [{ x: 0, y: 0, z: 0 }, { x: 3, y: 3, z: 1.8 }],
  thickness: 0.04,
  arrow: "end",
  color: "#2FBF71"
});

scene.addTooltip({
  id: "v_sum",
  title: "Vector Addition",
  properties: [
    { label: "Formula", value: "v1 + v2 = v_sum" },
    { label: "Components", value: "(3, 3, 1.8)" }
  ]
});

scene.addLine({
  id: "parallelogram_1",
  points: [{ x: 2, y: 1.1, z: 1.4 }, { x: 3, y: 3, z: 1.8 }],
  thickness: 0.02,
  color: "#AAB2BD"
});

scene.addLine({
  id: "parallelogram_2",
  points: [{ x: 1, y: 1.9, z: 0.4 }, { x: 3, y: 3, z: 1.8 }],
  thickness: 0.02,
  color: "#AAB2BD"
});

scene.addLabel({ id: "label_v1", text: "v1", position: { x: 2.05, y: 1.1, z: 1.4 }, color: "#F25C54" });
scene.addLabel({ id: "label_v2", text: "v2", position: { x: 1.05, y: 1.9, z: 0.4 }, color: "#2D7FF9" });
scene.addLabel({ id: "label_sum", text: "v1 + v2", position: { x: 3.05, y: 3, z: 1.8 }, color: "#2FBF71" });
`,
    },
    {
      id: "starter_distribution",
      title: "Starter: Normal Distribution",
      createdAt: now,
      updatedAt: now,
      sceneCode: `
scene.addAxes({
  id: "axes",
  x: { start: -5, end: 5 },
  y: { end: 4 },
  z: { end: 1 }
});
scene.setGrid(0.1);

scene.addLine({
  id: "normal_curve",
  points: {
    x: "t",
    y: "Math.exp(-0.5 * t * t) / Math.sqrt(2 * Math.PI) * 8",
    z: "0",
    tMin: -4,
    tMax: 4,
    tSteps: 100
  },
  thickness: 0.04,
  color: "#2D7FF9"
});

scene.addTooltip({
  id: "normal_curve",
  title: "Normal Distribution",
  properties: [
    { label: "1 sigma", value: "68.2% of data" },
    { label: "2 sigma", value: "95.4% of data" },
    { label: "3 sigma", value: "99.7% of data" }
  ]
});

scene.addLine({
  id: "mean_line",
  points: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 3.5, z: 0 }],
  thickness: 0.02,
  color: "#F25C54"
});

scene.addPoint({ id: "peak", center: { x: 0, y: 3.19, z: 0 }, color: "#F25C54" });

scene.addLine({ id: "sigma_1_neg", points: [{ x: -1, y: 0, z: 0 }, { x: -1, y: 1.94, z: 0 }], thickness: 0.02, color: "#F2C14E" });
scene.addLine({ id: "sigma_1_pos", points: [{ x: 1, y: 0, z: 0 }, { x: 1, y: 1.94, z: 0 }], thickness: 0.02, color: "#F2C14E" });
scene.addPoint({ id: "sigma_1_neg_point", center: { x: -1, y: 1.94, z: 0 }, color: "#F2C14E" });
scene.addPoint({ id: "sigma_1_pos_point", center: { x: 1, y: 1.94, z: 0 }, color: "#F2C14E" });

scene.addLine({ id: "sigma_2_neg", points: [{ x: -2, y: 0, z: 0 }, { x: -2, y: 0.43, z: 0 }], thickness: 0.02, color: "#2FBF71" });
scene.addLine({ id: "sigma_2_pos", points: [{ x: 2, y: 0, z: 0 }, { x: 2, y: 0.43, z: 0 }], thickness: 0.02, color: "#2FBF71" });
scene.addPoint({ id: "sigma_2_neg_point", center: { x: -2, y: 0.43, z: 0 }, color: "#2FBF71" });
scene.addPoint({ id: "sigma_2_pos_point", center: { x: 2, y: 0.43, z: 0 }, color: "#2FBF71" });

scene.addLabel({ id: "mu_label", text: "mu = 0", position: { x: 0.2, y: 3.6, z: 0 }, color: "#E6E8EB" });
scene.addLabel({ id: "sigma_1_label", text: "1 sigma", position: { x: 1.2, y: 2.2, z: 0 }, color: "#F2C14E" });
scene.addLabel({ id: "sigma_2_label", text: "2 sigma", position: { x: 2.2, y: 0.8, z: 0 }, color: "#2FBF71" });
scene.addLabel({ id: "pdf_label", text: "PDF = Probability Density Function", position: { x: -3.5, y: 3.8, z: 0 }, color: "#AAB2BD" });
`,
    },
  ];
}
