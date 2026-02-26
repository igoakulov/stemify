import type * as THREE from "three";

export type Vec3 = number[];
export type Vec2 = number[];

export type ObjectMeta = {
  id: string;
  type: string;
};

export type AddPoly2DConfig = {
  id: string;
  points: Vec2[];
  offset?: Vec3;
  position?: Vec3;
  color?: string;
  opacity?: number;
  lookat?: Vec3;
  spin?: number;
  selectable?: boolean;
};

export type AddPointConfig = {
  id: string;
  position?: Vec3;
  offset?: Vec3;
  color?: string;
  selectable?: boolean;
};

export type AddLineConfig = {
  id: string;
  points: Vec3[];
  tension?: number;
  lookat?: Vec3;
  spin?: number;
  thickness?: number;
  arrow?: "none" | "start" | "end" | "both";
  offset?: Vec3;
  color?: string;
  selectable?: boolean;
};

export type AddCurveConfig = {
  id: string;
  steps?: number;
  tMin: number;
  tMax: number;
  x: string | number;
  y: string | number;
  z: string | number;
  lookat?: Vec3;
  spin?: number;
  thickness?: number;
  arrow?: "none" | "start" | "end" | "both";
  offset?: Vec3;
  color?: string;
  selectable?: boolean;
};

export type AddCircleConfig = {
  id: string;
  position?: Vec3;
  offset?: Vec3;
  radius?: number;
  lookat?: Vec3;
  stretch?: Vec3;
  anglecut?: [number, number] | number;
  spin?: number;
  color?: string;
  opacity?: number;
  outline?: number;
  selectable?: boolean;
};

export type AddSphereConfig = {
  id: string;
  position?: Vec3;
  offset?: Vec3;
  radius: number;
  stretch?: Vec3;
  anglecut?: [number, number] | number;
  flatcut?: [number, number] | number;
  lookat?: Vec3;
  spin?: number;
  color?: string;
  opacity?: number;
  selectable?: boolean;
};

export type AddCylinderConfig = {
  id: string;
  position: Vec3;
  height?: number[] | number;
  radius?: number[];
  offset?: Vec3;
  anglecut?: [number, number] | number;
  spin?: number;
  lookat?: Vec3;
  color?: string;
  opacity?: number;
  selectable?: boolean;
};

export type AddPoly3DConfig = {
  id: string;
  points: Vec3[];
  offset?: Vec3;
  color?: string;
  opacity?: number;
  lookat?: Vec3;
  spin?: number;
  selectable?: boolean;
};

export type AddDonutConfig = {
  id: string;
  position?: Vec3;
  offset?: Vec3;
  radius: number;
  thickness: number;
  lookat?: Vec3;
  anglecut?: [number, number] | number;
  spin?: number;
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
  lookat?: Vec3;
  spin?: number;
  offset?: Vec3;
  selectable?: boolean;
};

export type AddAnimationConfig = {
  id: string;
  updateFunction: string;
};

export type AddCustomMeshConfig = {
  id: string;
  createFn: string;
  position?: Vec3;
  offset?: Vec3;
  color?: string;
  lookat?: Vec3;
  spin?: number;
  selectable?: boolean;
};

export type AddTooltipConfig = {
  id: string;
  title: string;
  properties?: Array<{ label: string; value: string }>;
};

export type SetCameraConfig = {
  position?: Vec3;
  lookat?: Vec3;
};

export type SceneApi = {
  point: (config: AddPointConfig) => void;
  line: (config: AddLineConfig) => void;
  curve: (config: AddCurveConfig) => void;
  poly2: (config: AddPoly2DConfig) => void;
  circle: (config: AddCircleConfig) => void;

  sphere: (config: AddSphereConfig) => void;
  cylinder: (config: AddCylinderConfig) => void;
  poly3: (config: AddPoly3DConfig) => void;
  donut: (config: AddDonutConfig) => void;

  axes: (config?: AddAxesConfig) => void;
  label: (config: AddLabelConfig) => void;
  group: (config: AddGroupConfig) => void;
  animation: (config: AddAnimationConfig) => void;
  mesh: (config: AddCustomMeshConfig) => void;
  tooltip: (config: AddTooltipConfig) => void;
  grid: (size: number) => void;
  smoothness: (segments: number) => void;
  camera: (config: SetCameraConfig) => void;

  getObject: (id: string) => THREE.Object3D | undefined;
  listObjects: () => ObjectMeta[];
};
