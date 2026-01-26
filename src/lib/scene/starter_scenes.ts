import type { SavedScene } from "@/lib/scene/store";

export function get_starter_scenes(): SavedScene[] {
  const now = Date.now();

  return [
    {
      id: "starter_vectors",
      title: "Starter: Vectors",
      createdAt: now,
      updatedAt: now,
      sceneCode: `
scene.addAxes({ id: "axes", length: 5 });

scene.addVector({
  id: "v1",
  from: { x: 0, y: 0, z: 0 },
  to: { x: 2.0, y: 1.1, z: 1.4 },
  color: "#F25C54",
  description: "v1",
});

scene.addVector({
  id: "v2",
  from: { x: 0, y: 0, z: 0 },
  to: { x: 1.0, y: 1.9, z: 0.4 },
  color: "#2D7FF9",
  description: "v2",
});

scene.addVector({
  id: "v_sum",
  from: { x: 0, y: 0, z: 0 },
  to: { x: 3.0, y: 3.0, z: 1.8 },
  color: "#2FBF71",
  description: "v1 + v2",
});

scene.addCurve({
  id: "parallelogram_1",
  points: [
    { x: 2.0, y: 1.1, z: 1.4 },
    { x: 3.0, y: 3.0, z: 1.8 },
  ],
  color: "#AAB2BD",
  description: "parallelogram side",
});

scene.addCurve({
  id: "parallelogram_2",
  points: [
    { x: 1.0, y: 1.9, z: 0.4 },
    { x: 3.0, y: 3.0, z: 1.8 },
  ],
  color: "#AAB2BD",
  description: "parallelogram side",
});

scene.addLabel({
  id: "label_v1",
  text: "v1",
  position: { x: 2.05, y: 1.1, z: 1.4 },
});

scene.addLabel({
  id: "label_v2",
  text: "v2",
  position: { x: 1.05, y: 1.9, z: 0.4 },
});

scene.addLabel({
  id: "label_sum",
  text: "v1 + v2",
  position: { x: 3.05, y: 3.0, z: 1.8 },
});
`,
      objects: [
        { id: "axes", type: "axes", description: "Axes" },
        { id: "v1", type: "vector", description: "v1" },
        { id: "v2", type: "vector", description: "v2" },
        { id: "v_sum", type: "vector", description: "v1 + v2" },
      ],
    },
    {
      id: "starter_distribution",
      title: "Starter: Normal distribution",
      createdAt: now,
      updatedAt: now,
      sceneCode: `
scene.addAxes({ id: "axes", length: 5 });

// Normal distribution (mu=0, sigma=1) polyline (coarsely sampled)
scene.addCurve({
  id: "normal_curve",
  color: "#E6E8EB",
  points: [
    { x: -4.0, y: 0.0001, z: 0 },
    { x: -3.0, y: 0.0044, z: 0 },
    { x: -2.0, y: 0.0540, z: 0 },
    { x: -1.0, y: 0.2420, z: 0 },
    { x: 0.0, y: 0.3990, z: 0 },
    { x: 1.0, y: 0.2420, z: 0 },
    { x: 2.0, y: 0.0540, z: 0 },
    { x: 3.0, y: 0.0044, z: 0 },
    { x: 4.0, y: 0.0001, z: 0 },
  ],
  description: "Normal PDF",
});

scene.addVector({
  id: "mu_line",
  from: { x: 0, y: 0, z: 0 },
  to: { x: 0, y: 0.399, z: 0 },
  color: "#F2C14E",
  description: "Mean (mu)",
});

scene.addLabel({
  id: "mu_label",
  text: "mu = 0",
  position: { x: 0.1, y: 0.42, z: 0 },
});

scene.addShape({
  id: "pt_mu",
  type: "sphere",
  position: { x: 0, y: 0.399, z: 0 },
  size: 0.18,
  color: "#F25C54",
  description: "Peak",
});
`,
      objects: [
        { id: "axes", type: "axes", description: "Axes" },
        { id: "normal_curve", type: "curve", description: "Normal PDF" },
      ],
    },
  ];
}
