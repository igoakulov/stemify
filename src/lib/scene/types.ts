import type * as THREE from "three";

export type Vec3 = number[];
export type Vec2 = number[];

export type ObjectMeta = {
  id: string;
  type: string;
};

export type Poly2Config = {
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

export type PointConfig = {
  id: string;
  position?: Vec3;
  offset?: Vec3;
  color?: string;
  selectable?: boolean;
};

export type LineConfig = {
  id: string;
  points: Vec3[];
  thickness?: number;
  tension?: number;
  arrow?: "none" | "start" | "end" | "both";
  offset?: Vec3;
  lookat?: Vec3;
  spin?: number;
  color?: string;
  selectable?: boolean;
};

export type CurveConfig = {
  id: string;
  tMin: string | number;
  tMax: string | number;
  x: string | number;
  y: string | number;
  z?: string | number;
  steps?: number;
  thickness?: number;
  arrow?: "none" | "start" | "end" | "both";
  offset?: Vec3;
  lookat?: Vec3;
  spin?: number;
  color?: string;
  selectable?: boolean;
};

export type CircleConfig = {
  id: string;
  radius?: number;
  position?: Vec3;
  offset?: Vec3;
  lookat?: Vec3;
  spin?: number;
  stretch?: Vec3;
  anglecut?: [number, number] | number;
  color?: string;
  opacity?: number;
  outline?: number;
  selectable?: boolean;
};

export type SphereConfig = {
  id: string;
  radius: number;
  position?: Vec3;
  offset?: Vec3;
  lookat?: Vec3;
  spin?: number;
  stretch?: Vec3;
  anglecut?: [number, number] | number;
  flatcut?: [number, number] | number;
  color?: string;
  opacity?: number;
  selectable?: boolean;
};

export type CylinderConfig = {
  id: string;
  height?: number | number[];
  radius?: number | number[];
  position?: Vec3;
  offset?: Vec3;
  lookat?: Vec3;
  spin?: number;
  anglecut?: [number, number] | number;
  color?: string;
  opacity?: number;
  selectable?: boolean;
};

export type Poly3Config = {
  id: string;
  points: Vec3[];
  position?: Vec3;
  offset?: Vec3;
  color?: string;
  opacity?: number;
  lookat?: Vec3;
  spin?: number;
  selectable?: boolean;
};

export type DonutConfig = {
  id: string;
  radius: number;
  thickness: number;
  position?: Vec3;
  offset?: Vec3;
  lookat?: Vec3;
  spin?: number;
  anglecut?: [number, number] | number;
  color?: string;
  opacity?: number;
  selectable?: boolean;
};

export type AxisRange = [number, number] | [];

export type AxesConfig = {
  id?: string;
  x?: AxisRange;
  y?: AxisRange;
  z?: AxisRange;
  position?: Vec3;
  selectable?: boolean;
};

export type LabelConfig = {
  id: string;
  text: string;
  position?: Vec3;
  color?: string;
  fontSizePx?: number;
  selectable?: boolean;
};

export type GroupConfig = {
  id: string;
  children: string[];
  offset?: Vec3;
  lookat?: Vec3;
  spin?: number;
  selectable?: boolean;
};

export type AnimationConfig = {
  id: string;
  updateFunction: string;
};

export type MeshConfig = {
  id: string;
  createFn: string;
  position?: Vec3;
  offset?: Vec3;
  color?: string;
  lookat?: Vec3;
  spin?: number;
  selectable?: boolean;
};

export type TooltipConfig = {
  id: string;
  title: string;
  properties?: string | Array<{ label: string; value: string }>;
};

export type CameraConfig = {
  position?: Vec3;
  lookat?: Vec3;
};

export type SceneApi = {
  point: (config: PointConfig) => void;
  line: (config: LineConfig) => void;
  curve: (config: CurveConfig) => void;
  poly2: (config: Poly2Config) => void;
  circle: (config: CircleConfig) => void;

  sphere: (config: SphereConfig) => void;
  cylinder: (config: CylinderConfig) => void;
  poly3: (config: Poly3Config) => void;
  donut: (config: DonutConfig) => void;

  axes: (config?: AxesConfig) => void;
  label: (config: LabelConfig) => void;
  group: (config: GroupConfig) => void;
  animation: (config: AnimationConfig) => void;
  mesh: (config: MeshConfig) => void;
  tooltip: (config: TooltipConfig) => void;
  grid: (size: number) => void;
  smoothness: (segments: number) => void;
  camera: (config: CameraConfig) => void;

  getObject: (id: string) => THREE.Object3D | undefined;
  listObjects: () => ObjectMeta[];
};
