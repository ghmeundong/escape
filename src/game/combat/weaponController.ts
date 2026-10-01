import * as THREE from "three";

export function calculateShotSpread(params: {
  aiming: boolean;
  moving: boolean;
  sprinting: boolean;
  airborne: boolean;
  aimingSpread: number;
  hipfireSpread: number;
  spreadMultiplier: number;
  movementSpreadMultiplier: number;
  sprintSpreadMultiplier: number;
  aimingJumpSpreadMultiplier: number;
  hipfireJumpSpreadMultiplier: number;
}): number {
  const {
    aiming,
    moving,
    sprinting,
    airborne,
    aimingSpread,
    hipfireSpread,
    spreadMultiplier,
    movementSpreadMultiplier,
    sprintSpreadMultiplier,
    aimingJumpSpreadMultiplier,
    hipfireJumpSpreadMultiplier,
  } = params;
  const baseSpread = aiming ? aimingSpread : hipfireSpread;
  const movementMultiplier = moving ? movementSpreadMultiplier : 1;
  const sprintMultiplier = moving && sprinting ? sprintSpreadMultiplier : 1;
  const jumpMultiplier = airborne
    ? aiming
      ? aimingJumpSpreadMultiplier
      : hipfireJumpSpreadMultiplier
    : 1;
  return (
    baseSpread *
    spreadMultiplier *
    movementMultiplier *
    sprintMultiplier *
    jumpMultiplier
  );
}

export function calculateSpreadPixels(
  spreadAngle: number,
  fovDegrees: number,
  viewportHeight: number,
): number {
  const fovRadians = THREE.MathUtils.degToRad(fovDegrees);
  return (
    (Math.tan(spreadAngle) * viewportHeight) / (2 * Math.tan(fovRadians / 2))
  );
}

export function calculateShotDirection(params: {
  cameraPosition: THREE.Vector3;
  forward: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  muzzlePosition: THREE.Vector3;
  aimDistance: number;
  spread: number;
  random?: () => number;
  aimPoint: THREE.Vector3;
  direction: THREE.Vector3;
}): THREE.Vector3 {
  const {
    cameraPosition,
    forward,
    right,
    up,
    muzzlePosition,
    aimDistance,
    spread,
    random = Math.random,
    aimPoint,
    direction,
  } = params;
  aimPoint.copy(cameraPosition).addScaledVector(forward, aimDistance);
  aimPoint.addScaledVector(right, (random() - 0.5) * spread * aimDistance);
  aimPoint.addScaledVector(up, (random() - 0.5) * spread * aimDistance);
  return direction.copy(aimPoint).sub(muzzlePosition).normalize();
}

export function calculateRecoilStrength(
  aiming: boolean,
  recoilMultiplier: number,
): number {
  return (aiming ? 0.06 : 0.048) * recoilMultiplier;
}

export function createWeaponRig(): {
  weapon: THREE.Group;
  modelMuzzle: THREE.Object3D;
  weaponPosition: THREE.Vector3;
  weaponRotation: THREE.Euler;
  hipPosition: THREE.Vector3;
  hipRotation: THREE.Euler;
  adsPosition: THREE.Vector3;
  adsRotation: THREE.Euler;
  muzzleFlash: THREE.Mesh;
} {
  const weapon = new THREE.Group();
  const modelMuzzle = new THREE.Object3D();
  weapon.add(modelMuzzle);
  const weaponPosition = new THREE.Vector3(0.44, -0.27, -0.58);
  const weaponRotation = new THREE.Euler(-0.03, 0.04, 0.02);
  const hipPosition = weaponPosition.clone();
  const hipRotation = weaponRotation.clone();
  const adsPosition = new THREE.Vector3(0, -0.22, -0.47);
  const adsRotation = new THREE.Euler(-0.01, 0.002, 0);

  const weaponBodyMaterial = new THREE.MeshStandardMaterial({
    color: "#090a0b",
    roughness: 0.34,
    metalness: 0.78,
    fog: false,
  });
  const weaponBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.15, 0.52),
    weaponBodyMaterial,
  );
  weaponBody.position.z = -0.18;
  weaponBody.castShadow = false;
  weapon.add(weaponBody);

  const weaponSlide = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.08, 0.5),
    weaponBodyMaterial,
  );
  weaponSlide.position.set(0, 0.11, -0.2);
  weapon.add(weaponSlide);

  const weaponGrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.3, 0.14),
    weaponBodyMaterial,
  );
  weaponGrip.position.set(0, -0.16, 0.04);
  weaponGrip.rotation.x = -0.23;
  weapon.add(weaponGrip);

  const weaponBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.28, 12),
    weaponBodyMaterial,
  );
  weaponBarrel.rotation.x = Math.PI / 2;
  weaponBarrel.position.set(0, 0.11, -0.55);
  weapon.add(weaponBarrel);

  const muzzleFlash = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.24, 8),
    new THREE.MeshBasicMaterial({
      color: "#ffd36b",
      transparent: true,
      opacity: 0,
      fog: false,
    }),
  );
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.set(0, 0.11, -0.7);
  weapon.add(muzzleFlash);

  const rearSightLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.032, 0.038),
    weaponBodyMaterial,
  );
  rearSightLeft.position.set(-0.032, 0.16, 0.01);
  weapon.add(rearSightLeft);

  const rearSightRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.032, 0.038),
    weaponBodyMaterial,
  );
  rearSightRight.position.set(0.032, 0.16, 0.01);
  weapon.add(rearSightRight);

  const frontSight = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.032, 0.038),
    weaponBodyMaterial,
  );
  frontSight.position.set(0, 0.16, -0.44);
  weapon.add(frontSight);

  weaponBody.visible = false;
  weaponSlide.visible = false;
  weaponGrip.visible = false;
  weaponBarrel.visible = false;
  rearSightLeft.visible = false;
  rearSightRight.visible = false;
  frontSight.visible = false;

  return {
    weapon,
    modelMuzzle,
    weaponPosition,
    weaponRotation,
    hipPosition,
    hipRotation,
    adsPosition,
    adsRotation,
    muzzleFlash,
  };
}
