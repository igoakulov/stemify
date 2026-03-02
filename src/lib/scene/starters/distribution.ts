import type { SavedScene } from "@/lib/scene/store";

export function get_starter_distribution(): SavedScene {
  // Use Date.now() for current time, or a fixed timestamp like 1700000000000 for backdating
  const now = Date.now();

  return {
    id: "starter_distribution",
    title: "Starter: Normal Distribution",
    createdAt: now,
    updatedAt: now,
    currentVersionId: "v1",
    versions: [
      {
        id: "v1",
        sceneId: "starter_distribution",
        createdAt: now,
        description: "Starter scene",
        userEditCount: 0,
        sceneCode: `scene.camera({
  position: [0, 6, 7],
  lookat: [0, 0, 0]
});
scene.grid(0.1);
scene.axes({
  id: "axes",
  x: [-5, 5],
  y: [0, 4],
  position: [0, 0, 0],
  selectable: false
});
scene.curve({
  id: "normal_curve",
  tMin: -4,
  tMax: 4,
  x: "t",
  y: "Math.exp(-0.5 * t * t) / Math.sqrt(2 * Math.PI) * 8",
  z: 0,
  steps: 100,
  thickness: 0.04,
  arrow: "none",
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#2D7FF9",
  selectable: true
});
scene.tooltip({
  id: "normal_curve",
  title: "Normal Distribution",
  properties: [
    { label: "1 sigma", value: "68.2% of data" },
    { label: "2 sigma", value: "95.4% of data" },
    { label: "3 sigma", value: "99.7% of data" }
  ]
});
scene.line({
  id: "mean_line",
  points: [[0, 0, 0], [0, 3.5, 0]],
  thickness: 0.02,
  tension: 0.5,
  arrow: "none",
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#F25C54",
  selectable: true
});
scene.point({
  id: "peak",
  position: [0, 3.19, 0],
  offset: [0, 0, 0],
  color: "#F25C54",
  selectable: true
});
scene.line({
  id: "sigma_1_neg",
  points: [[-1, 0, 0], [-1, 1.94, 0]],
  thickness: 0.02,
  tension: 0.5,
  arrow: "none",
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#F2C14E",
  selectable: true
});
scene.line({
  id: "sigma_1_pos",
  points: [[1, 0, 0], [1, 1.94, 0]],
  thickness: 0.02,
  tension: 0.5,
  arrow: "none",
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#F2C14E",
  selectable: true
});
scene.point({
  id: "sigma_1_neg_point",
  position: [-1, 1.94, 0],
  offset: [0, 0, 0],
  color: "#F2C14E",
  selectable: true
});
scene.point({
  id: "sigma_1_pos_point",
  position: [1, 1.94, 0],
  offset: [0, 0, 0],
  color: "#F2C14E",
  selectable: true
});
scene.line({
  id: "sigma_2_neg",
  points: [[-2, 0, 0], [-2, 0.43, 0]],
  thickness: 0.02,
  tension: 0.5,
  arrow: "none",
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#2FBF71",
  selectable: true
});
scene.line({
  id: "sigma_2_pos",
  points: [[2, 0, 0], [2, 0.43, 0]],
  thickness: 0.02,
  tension: 0.5,
  arrow: "none",
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#2FBF71",
  selectable: true
});
scene.point({
  id: "sigma_2_neg_point",
  position: [-2, 0.43, 0],
  offset: [0, 0, 0],
  color: "#2FBF71",
  selectable: true
});
scene.point({
  id: "sigma_2_pos_point",
  position: [2, 0.43, 0],
  offset: [0, 0, 0],
  color: "#2FBF71",
  selectable: true
});
scene.label({
  id: "mu_label",
  text: "mu = 0",
  position: [0.2, 3.6, 0],
  color: "#E6E8EB",
  fontSizePx: 16,
  selectable: true
});
scene.label({
  id: "sigma_1_label",
  text: "1 sigma",
  position: [1.2, 2.2, 0],
  color: "#F2C14E",
  fontSizePx: 16,
  selectable: true
});
scene.label({
  id: "sigma_2_label",
  text: "2 sigma",
  position: [2.2, 0.8, 0],
  color: "#2FBF71",
  fontSizePx: 16,
  selectable: true
});
scene.label({
  id: "pdf_label",
  text: "PDF = Probability Density Function",
  position: [-3.5, 3.8, 0],
  color: "#AAB2BD",
  fontSizePx: 16,
  selectable: true
});`,
      },
    ],
  };
}
