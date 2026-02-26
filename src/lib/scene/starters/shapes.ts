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
scene.axes({
  id: "axes",
  x: [-7, 7],
  y: [0, 3],
  z: [-7, 7],
});
scene.poly2({
  id: "house_body",
  points: [
    [0, 0],
    [0, 1],
    [2, 1],
    [2, 0]
  ],
  position: [-3,0,4],
  color: "#a85410ff",
  lookat: [0, 1, 0]
});
scene.poly2({
  id: "house_roof",
  points: [
    [0,0],
    [1.5,1],
    [3,0]
  ],
  position: [-3,0,3],
  color: "#F25C54",
  lookat: [0, 1, 0]
});
scene.group({
  id: "house",
  children: ["house_body", "house_roof"],
});
scene.poly2({
  id: "car_body",
  points: [
    [0,0],
    [0,0.5],
    [0.5,0.5],
    [1,1],
    [2,1],
    [2.5,0.5],
    [3.5,0.5],
    [3.5,0]
  ],
  position: [-5,0,6],
  color: "#EF4444",
  lookat: [0, 1, 0]
});
scene.circle({
  id: "wheel_back",
  position: [-6, 0.01, 6.5],
  radius: 0.25,
  lookat: [0, 1, 0],
  color: "#E6E8EB"
});
scene.circle({
  id: "wheel_front",
  position: [-4, 0.01, 6.5],
  radius: 0.25,
  lookat: [0, 1, 0],
  color: "#E6E8EB"
});
scene.group({
  id: "car",
  children: ["car_body", "wheel_back", "wheel_front"],
  lookat: [0, 0, 1]
});
scene.poly2({
  id: "triangle",
  points: [
    [0,0],
    [2,2],
    [2,0]
  ],
  color: "#2FBF71",
  position: [-3,0,-3],
  lookat: [0, 1, 0]
});
scene.circle({
  id: "disc",
  position: [-6, 0.01, -6],
  lookat: [0, 1, 0],
  color: "#2D7FF9"
});
scene.circle({
  id: "ring",
  position: [-6, 0, -3],
  lookat: [0, 1, 0],
  color: "#B07CFF",
  opacity: 0,
  outline: 0.2
});
scene.curve({
  id: "wavy_line",
  x: "-4 + t * 2",
  y: 0.01,
  z: "-6 + 0.5 * Math.sin(t * 12.56)",
  tMin: 0,
  tMax: 1,
  steps: 50,
  thickness: 0.05,
  color: "#F2C14E"
});
scene.sphere({
  id: "sphere",
  position: [3, 1, -6],
  flatcut: [90,90],
  color: "#F25C54",
  stretch: [1,1,1]

});
scene.cylinder({
  id: "stand",
  position: [6, 1, -6],
  height: [0.2, 1,0.01,1.5],
  radius: [0.5, 0.1, 0.2,1,1],
  lookat: [0, 1, 0],
  color: "#fff281ff",
  opacity: 0.3
});
scene.sphere({
  id: "bulb",
  radius: 0.2,
  position: [6,1.2,-6],
  color: "#eaff2bff",
  stretch: [1,2,1]
})
scene.group({
  id: "lamp",
  children:["stand", "bulb"]
})
scene.cylinder({
  id: "cone",
  position: [3, 1, -3],
  height: 2,
  radius: [1, 0],
  lookat: [0, 1, 0],
  color: "#2D7FF9"
});
scene.poly3({
  id: "pyramid",
  points: [
    [5, 0, -4],
    [7, 0, -4],
    [7, 0, -2],
    [5, 0, -2],
    [6, 1.5, -3]
  ],
  color: "#fffd8a",
  lookat: [0, 0, 1]
});
scene.sphere({
  id: "saturn_planet",
  position: [3, 1, 3],
  radius: 0.9,
  color: "#d1561dff",
});
scene.donut({
  id: "saturn_rings",
  position: [3, 1, 3],
  radius: 1.4,
  thickness: 0.15,
  lookat: [0.3, 1, 0],
  color: "#daaa42ff",
  opacity: 0.7
});
scene.group({
  id: "saturn",
  children: ["saturn_planet", "saturn_rings"],
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
  color: "#B07CFF"
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
  color: "#2FBF71"
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
});
scene.animation({
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
});`,
      },
    ],
  };
}
