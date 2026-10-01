import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import type { Camera } from "three";

export function createPointerControls(
  camera: Camera,
  canvas: HTMLCanvasElement,
): PointerLockControls {
  const controls = new PointerLockControls(camera, canvas);
  controls.pointerSpeed = 0.7;
  return controls;
}

export function setPointerSensitivity(
  controls: PointerLockControls,
  baseSensitivity: number,
  adsSensitivityRatio: number,
  aiming: boolean,
): void {
  controls.pointerSpeed = baseSensitivity * (aiming ? adsSensitivityRatio : 1);
}

export function lockPointerControls(
  controls: PointerLockControls,
  rawInputEnabled: boolean,
): void {
  controls.lock(rawInputEnabled);
}
