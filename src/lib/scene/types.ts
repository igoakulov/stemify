export type Vec3 = { x: number; y: number; z: number };

export type ObjectMeta = {
  id: string;
  type: string;
  description: string;
};

export type SceneApi = {
  addAxes: (config?: {
    id?: string;
    length?: number;
    position?: Vec3;
    description?: string;
  }) => void;

  addLabel: (config: {
    id: string;
    text: string;
    position: Vec3;
    color?: string;
    fontSizePx?: number;
  }) => void;

  addCurve: (config: {
    id: string;
    points: Vec3[];
    color?: string;
    dashed?: boolean;
    description?: string;
  }) => void;

  addShape: (config: {
    id: string;
    type: "cube" | "sphere";
    position: Vec3;
    color?: string;
    size?: number;
    description?: string;
  }) => void;

  addVector: (config: {
    id: string;
    from: Vec3;
    to: Vec3;
    color?: string;
    description?: string;
  }) => void;

  registerHover: (config: {
    id: string;
    title: string;
    properties?: Array<{ label: string; value: string }>;
  }) => void;

  listObjects: () => ObjectMeta[];
};
