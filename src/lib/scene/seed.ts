import { get_starter_scenes } from "@/lib/scene/starter_scenes";
import { load_saved_scenes, save_saved_scenes } from "@/lib/scene/store";

export function seed_starter_scenes_if_empty(): void {
  const existing = load_saved_scenes();

  // Fresh install
  if (existing.length === 0) {
    save_saved_scenes(get_starter_scenes());
    return;
  }

  // Backward compatibility: if starter scenes exist but were previously seeded with empty
  // sceneCode (older builds), patch them without overwriting user-modified starter scenes.
  const starters = get_starter_scenes();
  const starter_by_id = new Map(starters.map((s) => [s.id, s] as const));

  let min_created_at = existing[0]?.createdAt ?? Date.now();
  let min_updated_at = existing[0]?.updatedAt ?? Date.now();

  for (const s of existing) {
    min_created_at = Math.min(min_created_at, s.createdAt);
    min_updated_at = Math.min(min_updated_at, s.updatedAt);
  }

  let changed = false;

  const merged = existing.map((s) => {
    const starter = starter_by_id.get(s.id);
    if (!starter) return s;

    // Only patch if it looks like an old placeholder.
    if (s.sceneCode.trim().length === 0 && starter.sceneCode.trim().length > 0) {
      changed = true;
      return {
        ...starter,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    }

    return s;
  });

  // If a starter scene is missing entirely, add it as an old scene so it doesn't disrupt recents.
  for (const starter of starters) {
    if (merged.some((s) => s.id === starter.id)) continue;

    changed = true;
    merged.push({
      ...starter,
      createdAt: min_created_at - 1,
      updatedAt: min_updated_at - 1,
    });
  }

  if (changed) {
    save_saved_scenes(merged);
  }
}
