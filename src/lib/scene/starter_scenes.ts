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
  x: [0, 7],
  y: [0, 5],
  z: [0, 7],
  length: 5,
  position: [0, 0, 0],
  selectable: false
});

scene.addPoly2D({
  id: "house_body",
  points: [
    [-4, 0, 3],
    [-4, 0, 4],
    [-2, 0, 4],
    [-2, 0, 3]
  ],
  shift: [0, 0, 0],
  color: "#B07CFF",
  opacity: 0.5,
  direction: [0, 1, 0],
  rotation: 0,
  selectable: true
});

scene.addPoly2D({
  id: "house_roof",
  points: [
    [-4, 0, 3],
    [-2, 0, 3],
    [-3, 0, 2]
  ],
  shift: [0, 0, 0],
  color: "#F25C54",
  opacity: 0.6,
  direction: [0, 1, 0],
  rotation: 0,
  selectable: true
});

scene.addGroup({
  id: "house",
  children: ["house_body", "house_roof"],
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  selectable: true
});

scene.addPoly2D({
  id: "car_lower",
  points: [
    [-6.5, 0, 6.5],
    [-6.5, 0, 6],
    [-3.5, 0, 6],
    [-3.5, 0, 6.5]
  ],
  shift: [0, 0, 0],
  color: "#EF4444",
  opacity: 1,
  direction: [0, 1, 0],
  rotation: 0,
  selectable: true
});

scene.addPoly2D({
  id: "car_upper",
  points: [
    [-6, 0, 6],
    [-5.5, 0, 5.5],
    [-5, 0, 5.5],
    [-4.5, 0, 6]
  ],
  shift: [0, 0, 0],
  color: "#EF4444",
  opacity: 1,
  direction: [0, 1, 0],
  rotation: 0,
  selectable: true
});

scene.addCircle({
  id: "wheel_back",
  center: [-6, 0.05, 6.5],
  shift: [0, 0, 0],
  radius: 0.25,
  stretch: [1, 1, 1],
  anglecut: [0, 360],
  direction: [0, 1, 0],
  rotation: 0,
  color: "#E6E8EB",
  opacity: 1,
  selectable: true
});

scene.addCircle({
  id: "wheel_front",
  center: [-4, 0.05, 6.5],
  shift: [0, 0, 0],
  radius: 0.25,
  stretch: [1, 1, 1],
  anglecut: [0, 360],
  direction: [0, 1, 0],
  rotation: 0,
  color: "#E6E8EB",
  opacity: 1,
  selectable: true
});

scene.addGroup({
  id: "car",
  children: ["car_lower", "car_upper", "wheel_back", "wheel_front"],
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  selectable: true
});

scene.addPoly2D({
  id: "triangle",
  points: [
    [-4, 0, -2],
    [-2, 0, -2],
    [-2, 0, -4]
  ],
  shift: [0, 0, 0],
  color: "#2FBF71",
  opacity: 1,
  direction: [0, 1, 0],
  rotation: 0,
  selectable: true
});

scene.addCircle({
  id: "disc",
  center: [-6, 0.01, -6],
  shift: [0, 0, 0],
  radius: 1,
  stretch: [1, 1, 1],
  anglecut: [0, 360],
  direction: [0, 1, 0],
  rotation: 0,
  color: "#2D7FF9",
  opacity: 1,
  selectable: true
});

scene.addCircle({
  id: "ring",
  center: [-6, 0, -3],
  shift: [0, 0, 0],
  radius: 1,
  stretch: [1, 1, 1],
  anglecut: [0, 360],
  direction: [0, 1, 0],
  rotation: 0,
  color: "#B07CFF",
  opacity: 0,
  selectable: true
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
  arrow: "none",
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  color: "#F2C14E",
  opacity: 1,
  selectable: true
});

scene.addSphere({
  id: "sphere",
  center: [3, 1, -6],
  shift: [0, 0, 0],
  radius: 1,
  stretch: [1, 1, 1],
  anglecut: [0, 360],
  direction: [0, 0, 1],
  rotation: 0,
  color: "#F25C54",
  opacity: 1,
  selectable: true
});

scene.addCylinder({
  id: "hourglass",
  points: [
    [6, 0.01, -6],
    [6, 1, -6],
    [6, 2, -6]
  ],
  shift: [0, 0, 0],
  radius: [0.5, 0.05, 0.5],
  anglecut: [0, 360],
  direction: [0, 0, 1],
  rotation: 0,
  color: "#E6E8EB",
  opacity: 1,
  selectable: true
});

scene.addCylinder({
  id: "cone",
  points: [[3, 0.01, -3], [3, 2, -3]],
  shift: [0, 0, 0],
  radius: [1, 0],
  anglecut: [0, 360],
  direction: [0, 0, 1],
  rotation: 0,
  color: "#2D7FF9",
  opacity: 1,
  selectable: true
});

scene.addPoly3D({
  id: "pyramid",
  points: [
    [5, 0, -4],
    [7, 0, -4],
    [7, 0, -2],
    [5, 0, -2],
    [6, 1.5, -3]
  ],
  shift: [0, 0, 0],
  color: "#8b5cf6",
  opacity: 1,
  direction: [0, 0, 1],
  rotation: 0,
  selectable: true
});

scene.addSphere({
  id: "saturn_planet",
  center: [3, 1, 3],
  shift: [0, 0, 0],
  radius: 0.8,
  stretch: [1, 1, 1],
  anglecut: [0, 360],
  direction: [0, 0, 1],
  rotation: 0,
  color: "#F2C14E",
  opacity: 1,
  selectable: true
});

scene.addDonut({
  id: "saturn_rings",
  center: [3, 1, 3],
  shift: [0, 0, 0],
  radius: 1.4,
  thickness: 0.2,
  anglecut: [0, 360],
  direction: [0.3, 1, 0],
  rotation: 0,
  color: "#E6E8EB",
  opacity: 0.7,
  selectable: true
});

scene.addGroup({
  id: "saturn",
  children: ["saturn_planet", "saturn_rings"],
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  selectable: true
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
  \`,
  center: [4, 1, 6],
  shift: [0, 0, 0],
  color: "#B07CFF",
  direction: [0, 0, 1],
  rotation: 0,
  selectable: true
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
  \`,
  center: [6, 1, 3],
  shift: [0, 0, 0],
  color: "#2FBF71",
  direction: [0, 0, 1],
  rotation: 0,
  selectable: true
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
scene.setGrid(0.5);

scene.addAxes({
  id: "axes",
  x: [0, 5],
  y: [0, 5],
  z: [0, 5],
  length: 5,
  position: [0, 0, 0],
  selectable: false
});

scene.addLine({
  id: "v1",
  points: [[0, 0, 0], [2, 1.1, 1.4]],
  thickness: 0.04,
  arrow: "end",
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  color: "#F25C54",
  opacity: 1,
  selectable: true
});

scene.addLine({
  id: "v2",
  points: [[0, 0, 0], [1, 1.9, 0.4]],
  thickness: 0.04,
  arrow: "end",
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  color: "#2D7FF9",
  opacity: 1,
  selectable: true
});

scene.addLine({
  id: "v_sum",
  points: [[0, 0, 0], [3, 3, 1.8]],
  thickness: 0.04,
  arrow: "end",
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  color: "#2FBF71",
  opacity: 1,
  selectable: true
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
  points: [[2, 1.1, 1.4], [3, 3, 1.8]],
  thickness: 0.02,
  arrow: "none",
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  color: "#AAB2BD",
  opacity: 1,
  selectable: true
});

scene.addLine({
  id: "parallelogram_2",
  points: [[1, 1.9, 0.4], [3, 3, 1.8]],
  thickness: 0.02,
  arrow: "none",
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  color: "#AAB2BD",
  opacity: 1,
  selectable: true
});

scene.addLabel({
  id: "label_v1",
  text: "v1",
  position: [2.05, 1.1, 1.4],
  color: "#F25C54",
  fontSizePx: 14,
  selectable: true
});

scene.addLabel({
  id: "label_v2",
  text: "v2",
  position: [1.05, 1.9, 0.4],
  color: "#2D7FF9",
  fontSizePx: 14,
  selectable: true
});

scene.addLabel({
  id: "label_sum",
  text: "v1 + v2",
  position: [3.05, 3, 1.8],
  color: "#2FBF71",
  fontSizePx: 14,
  selectable: true
});
`,
    },
    {
      id: "starter_distribution",
      title: "Starter: Normal Distribution",
      createdAt: now,
      updatedAt: now,
      sceneCode: `
scene.setGrid(0.1);

scene.addAxes({
  id: "axes",
  x: [0, 5],
  y: [0, 4],
  z: [0, 1],
  length: 5,
  position: [0, 0, 0],
  selectable: false
});

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
  arrow: "none",
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  color: "#2D7FF9",
  opacity: 1,
  selectable: true
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
  points: [[0, 0, 0], [0, 3.5, 0]],
  thickness: 0.02,
  arrow: "none",
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  color: "#F25C54",
  opacity: 1,
  selectable: true
});

scene.addPoint({
  id: "peak",
  center: [0, 3.19, 0],
  shift: [0, 0, 0],
  color: "#F25C54",
  selectable: true
});

scene.addLine({
  id: "sigma_1_neg",
  points: [[-1, 0, 0], [-1, 1.94, 0]],
  thickness: 0.02,
  arrow: "none",
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  color: "#F2C14E",
  opacity: 1,
  selectable: true
});

scene.addLine({
  id: "sigma_1_pos",
  points: [[1, 0, 0], [1, 1.94, 0]],
  thickness: 0.02,
  arrow: "none",
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  color: "#F2C14E",
  opacity: 1,
  selectable: true
});

scene.addPoint({
  id: "sigma_1_neg_point",
  center: [-1, 1.94, 0],
  shift: [0, 0, 0],
  color: "#F2C14E",
  selectable: true
});

scene.addPoint({
  id: "sigma_1_pos_point",
  center: [1, 1.94, 0],
  shift: [0, 0, 0],
  color: "#F2C14E",
  selectable: true
});

scene.addLine({
  id: "sigma_2_neg",
  points: [[-2, 0, 0], [-2, 0.43, 0]],
  thickness: 0.02,
  arrow: "none",
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  color: "#2FBF71",
  opacity: 1,
  selectable: true
});

scene.addLine({
  id: "sigma_2_pos",
  points: [[2, 0, 0], [2, 0.43, 0]],
  thickness: 0.02,
  arrow: "none",
  direction: [0, 0, 1],
  rotation: 0,
  shift: [0, 0, 0],
  color: "#2FBF71",
  opacity: 1,
  selectable: true
});

scene.addPoint({
  id: "sigma_2_neg_point",
  center: [-2, 0.43, 0],
  shift: [0, 0, 0],
  color: "#2FBF71",
  selectable: true
});

scene.addPoint({
  id: "sigma_2_pos_point",
  center: [2, 0.43, 0],
  shift: [0, 0, 0],
  color: "#2FBF71",
  selectable: true
});

scene.addLabel({
  id: "mu_label",
  text: "mu = 0",
  position: [0.2, 3.6, 0],
  color: "#E6E8EB",
  fontSizePx: 14,
  selectable: true
});

scene.addLabel({
  id: "sigma_1_label",
  text: "1 sigma",
  position: [1.2, 2.2, 0],
  color: "#F2C14E",
  fontSizePx: 14,
  selectable: true
});

scene.addLabel({
  id: "sigma_2_label",
  text: "2 sigma",
  position: [2.2, 0.8, 0],
  color: "#2FBF71",
  fontSizePx: 14,
  selectable: true
});

scene.addLabel({
  id: "pdf_label",
  text: "PDF = Probability Density Function",
  position: [-3.5, 3.8, 0],
  color: "#AAB2BD",
  fontSizePx: 14,
  selectable: true
});
`,
    },
  ];
}
