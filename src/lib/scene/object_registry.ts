import type * as THREE from "three";

import { SCENE_ROOT_ID } from "@/lib/scene/constants";
import type { ObjectMeta } from "@/lib/scene/types";

export type HoverData = {
  title: string;
  properties?: Array<{ label: string; value: string }>;
};

export type ObjectData = {
  meta: ObjectMeta;
  selectable: boolean;
  parentId: string | null;
};

export class ObjectRegistry {
  private _objects: ObjectMeta[] = [];
  private _meshes_by_id: Map<string, THREE.Object3D> = new Map();
  private _hover_by_id: Map<string, HoverData> = new Map();
  private _selectable_by_id: Map<string, boolean> = new Map();
  private _parent_by_id: Map<string, string | null> = new Map();
  private _children_by_id: Map<string, string[]> = new Map();

  add(meta: ObjectMeta, selectable: boolean = true, parentId: string | null = null): void {
    this._objects.push(meta);
    this._selectable_by_id.set(meta.id, selectable);
    this._parent_by_id.set(meta.id, parentId);

    if (parentId) {
      const siblings = this._children_by_id.get(parentId) ?? [];
      siblings.push(meta.id);
      this._children_by_id.set(parentId, siblings);
    }
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

  get_mesh(id: string): THREE.Object3D | undefined {
    return this._meshes_by_id.get(id);
  }

  get_selectable(id: string): boolean {
    return this._selectable_by_id.get(id) ?? true;
  }

  get_parent(id: string): string | null {
    return this._parent_by_id.get(id) ?? null;
  }

  set_parent(id: string, parentId: string): void {
    const oldParentId = this._parent_by_id.get(id);
    
    // Remove from old parent's children list
    if (oldParentId) {
      const oldSiblings = this._children_by_id.get(oldParentId) ?? [];
      this._children_by_id.set(oldParentId, oldSiblings.filter(c => c !== id));
    }
    
    // Update parent reference
    this._parent_by_id.set(id, parentId);
    
    // Add to new parent's children list
    const siblings = this._children_by_id.get(parentId) ?? [];
    if (!siblings.includes(id)) {
      siblings.push(id);
      this._children_by_id.set(parentId, siblings);
    }
  }

  get_children(id: string): string[] {
    return this._children_by_id.get(id) ?? [];
  }

  get_hover_data(id: string): HoverData | undefined {
    return this._hover_by_id.get(id);
  }

  find_path_to_root(id: string): string[] {
    if (id === SCENE_ROOT_ID) return ["scene"];
    
    const path: string[] = [];
    let current: string | null = id;
    
    while (current) {
      path.unshift(current);
      current = this._parent_by_id.get(current) ?? null;
    }
    
    path.unshift("scene");
    return path;
  }

  find_deepest_selectable(ids: string[]): string | null {
    for (const id of ids) {
      if (this.get_selectable(id)) {
        return id;
      }
    }
    return null;
  }

  clear(): void {
    this._objects = [];
    this._meshes_by_id.clear();
    this._hover_by_id.clear();
    this._selectable_by_id.clear();
    this._parent_by_id.clear();
    this._children_by_id.clear();
  }
}
