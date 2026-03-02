import type { SavedScene } from "@/lib/scene/store";

export function get_starter_vectors(): SavedScene {
  // Use Date.now() for current time, or a fixed timestamp like 1700000000000 for backdating
  const now = Date.now();

  return {
    id: "starter_vectors",
    title: "Starter: Vectors",
    createdAt: now,
    updatedAt: now,
    currentVersionId: "v1",
    versions: [
      {
        id: "v1",
        sceneId: "starter_vectors",
        createdAt: now,
        description: "Starter scene",
        userEditCount: 0,
        sceneCode: `scene.grid(0.5);
scene.axes({
  id: "axes",
  x: [0, 5],
  y: [0, 5],
  z: [0, 5],
  position: [0, 0, 0],
  selectable: false
});
scene.line({
  id: "v1",
  points: [[0, 0, 0], [2, 1.1, 1.4]],
  thickness: 0.04,
  tension: 0.5,
  arrow: "end",
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#F25C54",
  selectable: true
});
scene.line({
  id: "v2",
  points: [[0, 0, 0], [1, 1.9, 0.4]],
  thickness: 0.04,
  tension: 0.5,
  arrow: "end",
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#2D7FF9",
  selectable: true
});
scene.line({
  id: "v_sum",
  points: [[0, 0, 0], [3, 3, 1.8]],
  thickness: 0.04,
  tension: 0.5,
  arrow: "end",
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#2FBF71",
  selectable: true
});
scene.tooltip({
  id: "v_sum",
  title: "Vector Addition",
  properties: [
    { label: "Formula", value: "v1 + v2 = v_sum" },
    { label: "Components", value: "(3, 3, 1.8)" }
  ]
});
scene.line({
  id: "parallelogram_1",
  points: [[2, 1.1, 1.4], [3, 3, 1.8]],
  thickness: 0.02,
  tension: 0.5,
  arrow: "none",
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#AAB2BD",
  selectable: true
});
scene.line({
  id: "parallelogram_2",
  points: [[1, 1.9, 0.4], [3, 3, 1.8]],
  thickness: 0.02,
  tension: 0.5,
  arrow: "none",
  offset: [0, 0, 0],
  lookat: [0, 0, 1],
  spin: 0,
  color: "#AAB2BD",
  selectable: true
});
scene.label({
  id: "label_v1",
  text: "v1",
  position: [2.05, 1.1, 1.4],
  color: "#F25C54",
  fontSizePx: 14,
  selectable: true
});
scene.label({
  id: "label_v2",
  text: "v2",
  position: [1.05, 1.9, 0.4],
  color: "#2D7FF9",
  fontSizePx: 14,
  selectable: true
});
scene.label({
  id: "label_sum",
  text: "v1 + v2",
  position: [3.05, 3, 1.8],
  color: "#2FBF71",
  fontSizePx: 14,
  selectable: true
});`,
      },
    ],
  };
}
