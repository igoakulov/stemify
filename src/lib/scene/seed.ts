import { get_starter_scenes } from "@/lib/scene/starter_scenes";
import { load_saved_scenes, save_saved_scenes } from "@/lib/scene/store";

export function seed_starter_scenes_if_empty(): void {
  const existing = load_saved_scenes();
  if (existing.length > 0) return;

  // Seed as the initial saved scenes list.
  save_saved_scenes(get_starter_scenes());
}
