import type * as THREE from "three";

export type Vec3 = number[];

export type ObjectMeta = {
  id: string;
  type: string;
};

export type AddPointConfig = {
  id: string;
  center?: Vec3;
  shift?: Vec3;
  color?: string;
  selectable?: boolean;
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
  direction?: Vec3;
  rotation?: number;
  shift?: Vec3;
  color?: string;
  opacity?: number;
  selectable?: boolean;
};

export type AddPoly2DConfig = {
  id: string;
  points: Vec3[];
  shift?: Vec3;
  color?: string;
  opacity?: number;
  direction?: Vec3;
  rotation?: number;
  selectable?: boolean;
};

export type AddCircleConfig = {
  id: string;
  center?: Vec3;
  shift?: Vec3;
  radius: number;
  direction?: Vec3;
  stretch?: Vec3;
  anglecut?: [number, number] | number;
  rotation?: number;
  color?: string;
  opacity?: number;
  selectable?: boolean;
};

export type AddSphereConfig = {
  id: string;
  center?: Vec3;
  shift?: Vec3;
  radius: number;
  stretch?: Vec3;
  anglecut?: [number, number] | number;
  flatcut?: [number, number] | number;
  direction?: Vec3;
  rotation?: number;
  color?: string;
  opacity?: number;
  selectable?: boolean;
};

export type AddCylinderConfig = {
  id: string;
  points: Vec3[];
  shift?: Vec3;
  radius: number[];
  anglecut?: [number, number] | number;
  direction?: Vec3;
  rotation?: number;
  color?: string;
  opacity?: number;
  selectable?: boolean;
};

export type AddPoly3DConfig = {
  id: string;
  points: Vec3[];
  shift?: Vec3;
  color?: string;
  opacity?: number;
  direction?: Vec3;
  rotation?: number;
  selectable?: boolean;
};

export type AddDonutConfig = {
  id: string;
  center?: Vec3;
  shift?: Vec3;
  radius: number;
  thickness: number;
  direction?: Vec3;
  anglecut?: [number, number] | number;
  rotation?: number;
  color?: string;
  opacity?: number;
  selectable?: boolean;
};

export type AxisRange = [number, number] | [];

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
  selectable?: boolean;
};

export type AddGroupConfig = {
  id: string;
  children: string[];
  direction?: Vec3;
  rotation?: number;
  shift?: Vec3;
  selectable?: boolean;
};

export type AddAnimationConfig = {
  id: string;
  updateFunction: string;
};

export type AddCustomMeshConfig = {
  id: string;
  createFn: string;
  center?: Vec3;
  shift?: Vec3;
  color?: string;
  direction?: Vec3;
  rotation?: number;
  selectable?: boolean;
};

export type AddTooltipConfig = {
  id: string;
  title: string;
  properties?: Array<{ label: string; value: string }>;
};

export type SceneApi = {
  addPoint: (config: AddPointConfig) => void;
  addLine: (config: AddLineConfig) => void;
  addPoly2D: (config: AddPoly2DConfig) => void;
  addCircle: (config: AddCircleConfig) => void;

  addSphere: (config: AddSphereConfig) => void;
  addCylinder: (config: AddCylinderConfig) => void;
  addPoly3D: (config: AddPoly3DConfig) => void;
  addDonut: (config: AddDonutConfig) => void;

  addAxes: (config?: AddAxesConfig) => void;
  addLabel: (config: AddLabelConfig) => void;
  addGroup: (config: AddGroupConfig) => void;
  addAnimation: (config: AddAnimationConfig) => void;
  addCustomMesh: (config: AddCustomMeshConfig) => void;
  addTooltip: (config: AddTooltipConfig) => void;
  setGrid: (size: number) => void;
  setSmoothness: (segments: number) => void;

  getObject: (id: string) => THREE.Object3D | undefined;
  listObjects: () => ObjectMeta[];
};
