export const DEV_TEST_SCENE_CODE = `
scene.addAxes({ id: "axes", length: 4 });

scene.addLabel({
  id: "label_origin",
  text: "Origin",
  position: { x: 0, y: 0, z: 0 },
});

scene.addVector({
  id: "v",
  from: { x: 0, y: 0, z: 0 },
  to: { x: 2.4, y: 1.2, z: 0.8 },
  color: "#F2C14E",
  description: "v",
});

scene.addCurve({
  id: "curve_1",
  points: [
    { x: -2, y: 0.2, z: 0 },
    { x: -1, y: 0.6, z: 0 },
    { x: 0, y: 0.9, z: 0 },
    { x: 1, y: 0.6, z: 0 },
    { x: 2, y: 0.2, z: 0 },
  ],
  color: "#E6E8EB",
  description: "Sample curve",
});

scene.addShape({
  id: "cube_1",
  type: "cube",
  position: { x: 0, y: 0.5, z: 0 },
  size: 1,
  color: "#2D7FF9",
  description: "Unit cube",
});

scene.addShape({
  id: "sphere_1",
  type: "sphere",
  position: { x: 2, y: 1, z: 0 },
  size: 1,
  color: "#F25C54",
  description: "Unit sphere",
});
`;
