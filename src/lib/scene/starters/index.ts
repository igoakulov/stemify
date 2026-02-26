import type { SavedScene } from "@/lib/scene/store";
import { get_starter_shapes } from "./shapes";
import { get_starter_vectors } from "./vectors";
import { get_starter_distribution } from "./distribution";

export function get_starter_scenes(): SavedScene[] {
  return [
    get_starter_shapes(),
    get_starter_vectors(),
    get_starter_distribution(),
  ];
}
