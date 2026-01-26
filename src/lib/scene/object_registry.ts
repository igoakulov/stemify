import type * as THREE from "three";

import type { ObjectMeta } from "@/lib/scene/types";

export type HoverData = {
  title: string;
  properties?: Array<{ label: string; value: string }>;
};

export class ObjectRegistry {
  private _objects: ObjectMeta[] = [];
  private _meshes_by_id: Map<string, THREE.Object3D> = new Map();
  private _hover_by_id: Map<string, HoverData> = new Map();

  add(meta: ObjectMeta): void {
    this._objects.push(meta);
  }

  attach_mesh(id: string, mesh: THREE.Object3D): void {
    this._meshes_by_id.set(id, mesh);
  }

  register_hover(id: string, data: HoverData): void {
    this._hover_by_id.set(id, data);
  }

  list(): ObjectMeta[] {
    return this._objects;
  }

  clear(): void {
    this._objects = [];
    this._meshes_by_id.clear();
    this._hover_by_id.clear();
  }
}
