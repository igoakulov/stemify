export type ActiveScene = {
  id: string;
  title: string;
};

export function create_empty_scene() {
  const now = Date.now();

  const scene: ActiveScene = {
    id: `scene_${now}`,
    title: "Untitled scene",
  };

  return scene;
}
