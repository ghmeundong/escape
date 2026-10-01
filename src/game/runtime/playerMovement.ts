import * as THREE from "three";

export function calculateJumpMomentum(params: {
  camera: THREE.Camera;
  keys: ReadonlySet<string>;
  sprintJumpRequested: boolean;
  walkSpeed: number;
  runSpeed: number;
  sprintAcceleration: number;
  staminaSprintFactor: number;
}): { active: boolean; speed: number; direction: THREE.Vector3 } {
  const {
    camera,
    keys,
    sprintJumpRequested,
    walkSpeed,
    runSpeed,
    sprintAcceleration,
    staminaSprintFactor,
  } = params;
  const direction = new THREE.Vector3();
  const hasMovementInput =
    keys.has("KeyW") ||
    keys.has("KeyA") ||
    keys.has("KeyS") ||
    keys.has("KeyD");
  if (!hasMovementInput) return { active: false, speed: walkSpeed, direction };

  let speed = sprintJumpRequested
    ? walkSpeed +
      (runSpeed - walkSpeed) * sprintAcceleration * staminaSprintFactor
    : walkSpeed;
  camera.updateWorldMatrix(true, false);
  const forward = camera.getWorldDirection(new THREE.Vector3());
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  right.y = 0;
  right.normalize();
  direction
    .copy(right)
    .multiplyScalar(Number(keys.has("KeyD")) - Number(keys.has("KeyA")))
    .addScaledVector(
      forward,
      Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
    );
  if (direction.lengthSq() > 0) direction.normalize();
  else speed = walkSpeed;
  return { active: direction.lengthSq() > 0, speed, direction };
}
