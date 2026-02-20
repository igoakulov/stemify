import * as THREE from "three";

const MOVE_SPEED = 5;
const SPRINT_MULTIPLIER = 2;
const SPRINT_DELAY_MS = 500;
const DOUBLE_TAP_THRESHOLD_MS = 300;

export type FlyControlsConfig = {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  moveSpeed?: number;
  lookSpeed?: number;
};

export type FlyControls = {
  enabled: boolean;
  isActive: boolean;
  update: (delta: number) => void;
  dispose: () => void;
  setEnabled: (enabled: boolean) => void;
  reset: (position: THREE.Vector3, target: THREE.Vector3) => void;
  getPosition: () => THREE.Vector3;
  setPosition: (pos: THREE.Vector3) => void;
  getTarget: () => THREE.Vector3;
};

export function create_fly_controls(config: FlyControlsConfig): FlyControls {
  const { camera, domElement, moveSpeed = MOVE_SPEED, lookSpeed = 0.002 } = config;

  let enabled = false;
  let isActive = false;

  const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  };

  let sprintActive = false;
  let lastTapTime = 0;
  let lastTapKey: string | null = null;
  let sprintTimeoutId: ReturnType<typeof setTimeout> | null = null;

  let yaw = 0;
  let pitch = 0;

  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!enabled) return;

    const key = e.key.toLowerCase();

    switch (key) {
      case "w":
        if (!keys.forward) handleSprint("forward");
        keys.forward = true;
        break;
      case "s":
        if (!keys.backward) handleSprint("backward");
        keys.backward = true;
        break;
      case "a":
        if (!keys.left) handleSprint("left");
        keys.left = true;
        break;
      case "d":
        if (!keys.right) handleSprint("right");
        keys.right = true;
        break;
      case " ":
        if (!keys.up) handleSprint("up");
        keys.up = true;
        e.preventDefault();
        break;
      case "shift":
        if (!keys.down) handleSprint("down");
        keys.down = true;
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (!enabled) return;

    const key = e.key.toLowerCase();

    switch (key) {
      case "w":
        keys.forward = false;
        break;
      case "s":
        keys.backward = false;
        break;
      case "a":
        keys.left = false;
        break;
      case "d":
        keys.right = false;
        break;
      case " ":
        keys.up = false;
        break;
      case "shift":
        keys.down = false;
        break;
    }
  };

  const handleSprint = (key: string) => {
    const now = Date.now();

    if (lastTapKey === key && now - lastTapTime < DOUBLE_TAP_THRESHOLD_MS) {
      sprintActive = true;

      if (sprintTimeoutId) {
        clearTimeout(sprintTimeoutId);
      }

      sprintTimeoutId = setTimeout(() => {
        sprintActive = false;
        sprintTimeoutId = null;
      }, SPRINT_DELAY_MS);
    }

    lastTapTime = now;
    lastTapKey = key;
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (!enabled) return;

    if (e.button === 1) {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      e.preventDefault();
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (e.button === 1) {
      isDragging = false;
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!enabled || !isDragging) return;

    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;

    yaw -= deltaX * lookSpeed;
    pitch -= deltaY * lookSpeed;

    pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));

    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleWheel = (_e: WheelEvent) => {
    if (!enabled) return;
  };

  const handleContextMenu = (e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
    }
  };

  const updateSprintTimeout = () => {
    if (sprintActive) {
      const anyMovementKey =
        keys.forward ||
        keys.backward ||
        keys.left ||
        keys.right ||
        keys.up ||
        keys.down;

      if (!anyMovementKey) {
        if (sprintTimeoutId) {
          clearTimeout(sprintTimeoutId);
        }
        sprintTimeoutId = setTimeout(() => {
          sprintActive = false;
          sprintTimeoutId = null;
        }, SPRINT_DELAY_MS);
      }
    }
  };

  const update = (delta: number) => {
    if (!enabled) return;

    isActive =
      keys.forward ||
      keys.backward ||
      keys.left ||
      keys.right ||
      keys.up ||
      keys.down ||
      isDragging;

    updateSprintTimeout();

    const speed = moveSpeed * (sprintActive ? SPRINT_MULTIPLIER : 1) * delta;

    const direction = new THREE.Vector3();

    if (keys.forward) direction.z -= 1;
    if (keys.backward) direction.z += 1;
    if (keys.left) direction.x -= 1;
    if (keys.right) direction.x += 1;

    direction.normalize();

    direction.applyQuaternion(camera.quaternion);

    camera.position.addScaledVector(direction, speed);

    if (keys.up) {
      camera.position.y += speed;
    }
    if (keys.down) {
      camera.position.y -= speed;
    }
  };

  const dispose = () => {
    domElement.removeEventListener("keydown", handleKeyDown);
    domElement.removeEventListener("keyup", handleKeyUp);
    domElement.removeEventListener("mousedown", handleMouseDown);
    domElement.removeEventListener("mouseup", handleMouseUp);
    domElement.removeEventListener("mousemove", handleMouseMove);
    domElement.removeEventListener("wheel", handleWheel);
    domElement.removeEventListener("contextmenu", handleContextMenu);

    if (sprintTimeoutId) {
      clearTimeout(sprintTimeoutId);
    }
  };

  const setEnabled = (value: boolean) => {
    enabled = value;

    if (enabled) {
      yaw = camera.rotation.y;
      pitch = camera.rotation.x;
    } else {
      isDragging = false;
      keys.forward = false;
      keys.backward = false;
      keys.left = false;
      keys.right = false;
      keys.up = false;
      keys.down = false;
      sprintActive = false;
    }
  };

  const reset = (position: THREE.Vector3, target: THREE.Vector3) => {
    camera.position.copy(position);
    camera.lookAt(target);
    yaw = camera.rotation.y;
    pitch = camera.rotation.x;
  };

  const getPosition = () => camera.position.clone();
  const setPosition = (pos: THREE.Vector3) => camera.position.copy(pos);
  const getTarget = () => {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    return camera.position.clone().add(direction);
  };

  domElement.addEventListener("keydown", handleKeyDown);
  domElement.addEventListener("keyup", handleKeyUp);
  domElement.addEventListener("mousedown", handleMouseDown);
  domElement.addEventListener("mouseup", handleMouseUp);
  domElement.addEventListener("mousemove", handleMouseMove);
  domElement.addEventListener("wheel", handleWheel, { passive: false });
  domElement.addEventListener("contextmenu", handleContextMenu);

  return {
    get enabled() {
      return enabled;
    },
    get isActive() {
      return isActive;
    },
    update,
    dispose,
    setEnabled,
    reset,
    getPosition,
    setPosition,
    getTarget,
  };
}
