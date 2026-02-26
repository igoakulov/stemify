import { get_starter_scenes } from "@/lib/scene/starters";
import { load_saved_scenes, save_saved_scenes } from "@/lib/scene/store";

export function seed_starter_scenes_if_empty(): void {
  const existing = load_saved_scenes();

  if (existing.length === 0) {
    save_saved_scenes(get_starter_scenes());
    window.dispatchEvent(new Event("stemify:scenes-changed"));
  }
}
