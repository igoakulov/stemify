import * as THREE from "three";

const MOVE_SPEED = 5;
const LOOK_SPEED = 0.002;
const ROLL_SPEED = 1.5;

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
  getKeyState: () => { forward: boolean; backward: boolean; left: boolean; right: boolean; up: boolean; down: boolean };
  setSpeed: (speed: number) => void;
};

export function create_fly_controls(config: FlyControlsConfig): FlyControls {
  const { camera, domElement, moveSpeed: initialSpeed = MOVE_SPEED, lookSpeed = LOOK_SPEED } = config;

  let enabled = false;
  let isActive = false;
  let moveSpeed = initialSpeed;

  const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    rollLeft: false,
    rollRight: false,
  };

  let yaw = 0;
  let pitch = 0;
  let consecutiveWheelEvents = 0;
  let lastWheelDirection = { x: 0, y: 0 };

  const dispatchKeyState = () => {
    window.dispatchEvent(
      new CustomEvent("stemify:fly-controls-key-state", {
        detail: { ...keys },
      })
    );
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!enabled) return;

    // Skip if typing in input
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        keys.forward = true;
        break;
      case "KeyS":
      case "ArrowDown":
        keys.backward = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        keys.left = true;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.right = true;
        break;
      case "Space":
        keys.up = true;
        e.preventDefault();
        break;
      case "ShiftLeft":
      case "ShiftRight":
        keys.down = true;
        break;
      case "KeyQ":
        keys.rollLeft = true;
        break;
      case "KeyE":
        keys.rollRight = true;
        break;
    }

    dispatchKeyState();
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (!enabled) return;

    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        keys.forward = false;
        break;
      case "KeyS":
      case "ArrowDown":
        keys.backward = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        keys.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.right = false;
        break;
      case "Space":
        keys.up = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        keys.down = false;
        break;
      case "KeyQ":
        keys.rollLeft = false;
        break;
      case "KeyE":
        keys.rollRight = false;
        break;
    }

    dispatchKeyState();
  };

  const handleWheel = (e: WheelEvent) => {
    if (!enabled) return;

    // Ignore very small deltas (trackpad jitter on initial touch)
    if (Math.abs(e.deltaX) <= 1 && Math.abs(e.deltaY) <= 1) return;

    // Require 2 consecutive wheel events with consistent direction before applying rotation
    const currentDirection = { 
      x: Math.sign(e.deltaX), 
      y: Math.sign(e.deltaY) 
    };
    
    const hasConsistentDirection = (
      (currentDirection.x !== 0 && currentDirection.x === lastWheelDirection.x) ||
      (currentDirection.y !== 0 && currentDirection.y === lastWheelDirection.y)
    );
    
    if (hasConsistentDirection) {
      consecutiveWheelEvents++;
    } else {
      consecutiveWheelEvents = 1;
    }
    
    lastWheelDirection = currentDirection;

    // Skip rotation until we've seen 2 consistent events
    if (consecutiveWheelEvents < 2) {
      return;
    }

    // Clamp delta to prevent huge jumps from trackpad
    const clampedDeltaX = Math.max(-100, Math.min(100, e.deltaX));
    const clampedDeltaY = Math.max(-100, Math.min(100, e.deltaY));

    // Inverted look: swipe left → look left, swipe down → look down
    yaw += clampedDeltaX * lookSpeed;
    pitch += clampedDeltaY * lookSpeed;

    pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));

    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    // Preserve roll
    camera.rotation.z = 0;

    isActive = true;
  };

  const update = (delta: number) => {
    if (!enabled) return;

    isActive = keys.forward || keys.backward || keys.left || keys.right || keys.up || keys.down || keys.rollLeft || keys.rollRight;

    // delta is in milliseconds, convert to seconds
    const deltaSeconds = delta / 1000;
    const speed = moveSpeed * deltaSeconds;

    // Apply roll
    if (keys.rollLeft) {
      camera.rotation.z += ROLL_SPEED * deltaSeconds;
    }
    if (keys.rollRight) {
      camera.rotation.z -= ROLL_SPEED * deltaSeconds;
    }

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
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    domElement.removeEventListener("wheel", handleWheel);
  };

  const setEnabled = (value: boolean) => {
    enabled = value;

    if (enabled) {
      yaw = camera.rotation.y;
      pitch = camera.rotation.x;
      consecutiveWheelEvents = 0;
      lastWheelDirection = { x: 0, y: 0 };
    } else {
      keys.forward = false;
      keys.backward = false;
      keys.left = false;
      keys.right = false;
      keys.up = false;
      keys.down = false;
      keys.rollLeft = false;
      keys.rollRight = false;
    }

    dispatchKeyState();
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

  const getKeyState = () => ({ ...keys });

  const setSpeed = (speed: number) => {
    moveSpeed = speed;
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  domElement.addEventListener("wheel", handleWheel, { passive: false });

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
    getKeyState,
    setSpeed,
  };
}
