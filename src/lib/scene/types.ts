import type * as THREE from "three";

export type Vec3 = { x: number; y: number; z: number };

export type ObjectMeta = {
  id: string;
  type: string;
};

// 2D Primitives
export type AddPointConfig = {
  id: string;
  center: Vec3;
  color?: string;
};

export type AddLineConfig = {
  id: string;
  points: Vec3[] | {
    x: string;
    y: string;
    z: string;
    tMin: number;
    tMax: number;
    tSteps: number;
  };
  thickness?: number;
  arrow?: "none" | "start" | "end" | "both";
  slice?: { start: number; end: number };
  rotation?: { axis: Vec3; angle: number };
  color?: string;
  opacity?: number;
};

export type AddPoly2DConfig = {
  id: string;
  points: Vec3[];
  color?: string;
  opacity?: number;
  rotation?: { axis: Vec3; angle: number };
};

export type AddCircleConfig = {
  id: string;
  center: Vec3;
  radius: number;
  direction?: Vec3;
  stretch?: Vec3;
  slice?: { start: number; end: number };
  rotation?: number;
  color?: string;
  opacity?: number;
};

// 3D Primitives
export type AddSphereConfig = {
  id: string;
  center: Vec3;
  radius: number;
  stretch?: Vec3;
  slice?: { start: number; end: number };
  direction?: Vec3;
  rotation?: number;
  color?: string;
  opacity?: number;
};

export type AddCylinderConfig = {
  id: string;
  points: Vec3[];
  radius: number[];
  color?: string;
  opacity?: number;
};

export type AddPoly3DConfig = {
  id: string;
  points: Vec3[];
  color?: string;
  opacity?: number;
};

export type AddDonutConfig = {
  id: string;
  center: Vec3;
  radius: number;
  thickness: number;
  direction?: Vec3;
  slice?: { start: number; end: number };
  rotation?: number;
  color?: string;
  opacity?: number;
};

// Infrastructure
export type AxisRange = {
  start?: number;
  end?: number;
};

export type AddAxesConfig = {
  id?: string;
  x?: AxisRange;
  y?: AxisRange;
  z?: AxisRange;
  length?: number;
  position?: Vec3;
  selectable?: boolean;
};

export type AddLabelConfig = {
  id: string;
  text: string;
  position: Vec3;
  color?: string;
  fontSizePx?: number;
};

export type AddGroupConfig = {
  id: string;
  children: string[];
};

export type AddAnimationConfig = {
  id: string;
  updateFunction: string;
};

export type AddCustomMeshConfig = {
  id: string;
  createFn: string;
  color?: string;
};

export type AddTooltipConfig = {
  id: string;
  title: string;
  properties?: Array<{ label: string; value: string }>;
};

export type SceneApi = {
  // 2D Primitives
  addPoint: (config: AddPointConfig) => void;
  addLine: (config: AddLineConfig) => void;
  addPoly2D: (config: AddPoly2DConfig) => void;
  addCircle: (config: AddCircleConfig) => void;

  // 3D Primitives
  addSphere: (config: AddSphereConfig) => void;
  addCylinder: (config: AddCylinderConfig) => void;
  addPoly3D: (config: AddPoly3DConfig) => void;
  addDonut: (config: AddDonutConfig) => void;

  // Infrastructure
  addAxes: (config?: AddAxesConfig) => void;
  addLabel: (config: AddLabelConfig) => void;
  addGroup: (config: AddGroupConfig) => void;
  addAnimation: (config: AddAnimationConfig) => void;
  addCustomMesh: (config: AddCustomMeshConfig) => void;
  addTooltip: (config: AddTooltipConfig) => void;
  setGrid: (size: number) => void;
  setSmoothness: (segments: number) => void;

  // Registry access
  getObject: (id: string) => THREE.Object3D | undefined;
  listObjects: () => ObjectMeta[];
};
