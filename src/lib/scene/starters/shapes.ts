import type { SavedScene } from "@/lib/scene/store";

export function get_starter_shapes(): SavedScene {
  // Use Date.now() for current time, or a fixed timestamp like 1700000000000 for backdating
  const now = Date.now();

  return {
    id: "starter_shapes",
    title: "Starter: Shapes",
    createdAt: now,
    updatedAt: now,
    currentVersionId: "v1",
    versions: [
      {
        id: "v1",
        sceneId: "starter_shapes",
        createdAt: now,
        description: "Starter scene",
        userEditCount: 0,
        sceneCode: `scene.smoothness(128);
scene.grid(0.5);
scene.camera({
  position: [7, 7, 10],
  lookat: [0, 0, 0]
});
scene.axes({
  id: "axes",
  x: [-7, 7],
  y: [0, 3],
  z: [-7, 7],
  position: [0, 0, 0],
  selectable: false
});
scene.label({
  id: "click_me",
  text: "CLICK ME",
  position: [0, 5, 0],
  color: "#E6E8EB",
  fontSizePx: 20,
  selectable: true
});
scene.tooltip({
  id: "click_me",
  title: "EXPLORE ANY OBJECT",
  properties: "Edit shape parameters HERE --->"
});
scene.poly2({
  id: "house_body",
  points: [
    [0, 0],
    [0, 1],
    [2, 1],
    [2, 0]
  ],
  position: [-3, 0, 4],
  offset: [0, 0, 0],
  lookat: [0, 1, 0],
  spin: 0,
  color: "#a85410ff",
  opacity: 1,
  selectable: true
});
scene.poly2({
  id: "house_roof",
  points: [
    [0, 0],
    [1.5, 1],
    [3, 0]
  ],
  position: [-3, 0, 3],
  offset: [0, 0, 0],
  lookat: [0, 1, 0],
  spin: 0,
  color: "#F25C54",
  opacity: 1,
  selectable: true
});
scene.group({
  id: "house",
  children: ["house_body", "house_roof"],
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  selectable: true
});
scene.poly2({
  id: "car_body",
  points: [
    [0, 0],
    [0, 0.5],
    [0.5, 0.5],
    [1, 1],
    [2, 1],
    [2.5, 0.5],
    [3.5, 0.5],
    [3.5, 0]
  ],
  position: [-5, 0, 6],
  offset: [0, 0, 0],
  lookat: [0, 1, 0],
  spin: 0,
  color: "#EF4444",
  opacity: 1,
  selectable: true
});
scene.circle({
  id: "wheel_back",
  radius: 0.25,
  position: [-6, 0.01, 6.5],
  offset: [0, 0, 0],
  lookat: [0, 1, 0],
  spin: 0,
  stretch: [1, 1, 1],
  anglecut: 360,
  color: "#E6E8EB",
  outline: 0,
  opacity: 1,
  selectable: true
});
scene.circle({
  id: "wheel_front",
  radius: 0.25,
  position: [-4, 0.01, 6.5],
  offset: [0, 0, 0],
  lookat: [0, 1, 0],
  spin: 0,
  stretch: [1, 1, 1],
  anglecut: 360,
  color: "#E6E8EB",
  outline: 0,
  opacity: 1,
  selectable: true
});
scene.group({
  id: "car",
  children: ["car_body", "wheel_back", "wheel_front"],
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  selectable: true
});
scene.poly2({
  id: "triangle",
  points: [
    [0, 0],
    [2, 2],
    [2, 0]
  ],
  position: [-3, 0, -3],
  offset: [0, 0, 0],
  lookat: [0, 1, 0],
  spin: 0,
  color: "#2FBF71",
  opacity: 1,
  selectable: true
});
scene.circle({
  id: "disc",
  radius: 1,
  position: [-6, 0.01, -6],
  offset: [0, 0, 0],
  lookat: [0, 1, 0],
  spin: 0,
  stretch: [1, 1, 1],
  anglecut: 360,
  color: "#2D7FF9",
  outline: 0,
  opacity: 1,
  selectable: true
});
scene.circle({
  id: "ring",
  radius: 1,
  position: [-6, 0, -3],
  offset: [0, 0, 0],
  lookat: [0, 1, 0],
  spin: 0,
  stretch: [1, 1, 1],
  anglecut: 360,
  color: "#B07CFF",
  outline: 0.2,
  opacity: 0,
  selectable: true
});
scene.curve({
  id: "wavy_line",
  tMin: 0,
  tMax: 1,
  x: "-4 + t * 2",
  y: 0.01,
  z: "-6 + 0.5 * Math.sin(t * 12.56)",
  steps: 50,
  thickness: 0.05,
  arrow: "none",
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#F2C14E",
  selectable: true
});
scene.sphere({
  id: "sphere",
  radius: 1,
  position: [3, 1, -6],
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  stretch: [1, 1, 1],
  flatcut: [90, 90],
  anglecut: 360,
  color: "#F25C54",
  opacity: 1,
  selectable: true
});
scene.cylinder({
  id: "stand",
  height: [0.2, 1, 0.01, 1.5],
  radius: [0.5, 0.1, 0.2, 1, 1],
  position: [6, 1.3, -6],
  offset: [0, 0, 0],
  lookat: [0, 1, 0],
  spin: 0,
  anglecut: 360,
  color: "#fff281ff",
  opacity: 0.3,
  selectable: true
});
scene.sphere({
  id: "bulb",
  radius: 0.2,
  position: [6, 1.2, -6],
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  stretch: [1, 2, 1],
  flatcut: 180,
  anglecut: 360,
  color: "#eaff2bff",
  opacity: 1,
  selectable: true
});
scene.group({
  id: "lamp",
  children: ["stand", "bulb"],
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  selectable: true
});
scene.cylinder({
  id: "cone",
  height: 2,
  radius: [1, 0],
  position: [3, 1, -3],
  offset: [0, 0, 0],
  lookat: [0, 1, 0],
  spin: 0,
  anglecut: 360,
  color: "#2D7FF9",
  opacity: 1,
  selectable: true
});
scene.poly3({
  id: "pyramid",
  points: [
    [0, 0, -2],
    [2, 0, -2],
    [0, 0, 0],
    [2, 0, 0],
    [1, 1.5, -1]
  ],
  position: [6, 0.75, -3],
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#fffd8a",
  opacity: 1,
  selectable: true
});
scene.sphere({
  id: "saturn_planet",
  radius: 0.9,
  position: [3, 1, 3],
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  stretch: [1, 1, 1],
  flatcut: 180,
  anglecut: 360,
  color: "#d1561dff",
  opacity: 1,
  selectable: true
});
scene.donut({
  id: "saturn_rings",
  radius: 1.4,
  thickness: 0.15,
  position: [3, 1, 3],
  offset: [0, 0, 0],
  lookat: [0.3, 1, 0],
  spin: 0,
  anglecut: 360,
  color: "#daaa42ff",
  opacity: 0.7,
  selectable: true
});
scene.group({
  id: "saturn",
  children: ["saturn_planet", "saturn_rings"],
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  selectable: true
});
scene.mesh({
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
  position: [4, 1, 6],
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#B07CFF",
  selectable: true
});
scene.mesh({
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
  position: [6, 1, 3],
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#2FBF71",
  selectable: true
});
scene.animation({
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
});`,
      },
    ],
  };
}
