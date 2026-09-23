import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import type { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

export function createSharedPhysicsWorld(): RAPIER.World {
  const physicsWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  physicsWorld.createCollider(
    RAPIER.ColliderDesc.cuboid(1000, 0.1, 1000).setTranslation(0, -0.1, 0),
  );
  return physicsWorld;
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
  weaponBodyMaterial: THREE.MeshStandardMaterial;
  weaponSlideMaterial: THREE.MeshStandardMaterial;
  weaponBody: THREE.Mesh;
  weaponSlide: THREE.Mesh;
  weaponGrip: THREE.Mesh;
  weaponBarrel: THREE.Mesh;
  muzzleFlash: THREE.Mesh;
  rearSightLeft: THREE.Mesh;
  rearSightRight: THREE.Mesh;
  frontSight: THREE.Mesh;
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
  const weaponSlideMaterial = new THREE.MeshStandardMaterial({
    color: "#17191b",
    roughness: 0.27,
    metalness: 0.88,
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
    weaponSlideMaterial,
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
    weaponBodyMaterial,
    weaponSlideMaterial,
    weaponBody,
    weaponSlide,
    weaponGrip,
    weaponBarrel,
    muzzleFlash,
    rearSightLeft,
    rearSightRight,
    frontSight,
  };
}

export function tickPlayerStaminaRuntime(params: {
  delta: number;
  controls: PointerLockControls;
  keys: Set<string>;
  trueCarEntered: boolean;
  startScreen: HTMLElement;
  weaponReloading: boolean;
  playerStamina: number;
  playerSprintActive: boolean;
  staminaBarFill: HTMLElement;
}): { playerStamina: number; playerSprintActive: boolean } {
  const {
    delta,
    controls,
    keys,
    trueCarEntered,
    startScreen,
    weaponReloading,
    playerStamina: currentStamina,
    playerSprintActive: currentSprint,
    staminaBarFill,
  } = params;

  const sprintPressed =
    controls.isLocked &&
    !trueCarEntered &&
    !startScreen.classList.contains("is-visible") &&
    keys.has("KeyW") &&
    !weaponReloading &&
    (keys.has("ShiftLeft") || keys.has("ShiftRight"));

  const playerMaxStamina = 130;
  const playerSprintThresholdRatio = 0.3;
  const playerStaminaDrainPerSecond = 34;
  const playerStaminaRegenPerSecond = 22;
  const playerSprintThreshold = playerMaxStamina * playerSprintThresholdRatio;

  let playerStamina = currentStamina;
  let playerSprintActive = currentSprint;
  const canSprint =
    playerStamina > 0.01 &&
    (playerSprintActive || playerStamina >= playerSprintThreshold);

  if (!sprintPressed) {
    playerSprintActive = false;
    playerStamina = Math.min(
      playerMaxStamina,
      playerStamina + playerStaminaRegenPerSecond * delta,
    );
  } else if (canSprint) {
    playerSprintActive = true;
    playerStamina = Math.max(
      0,
      playerStamina - playerStaminaDrainPerSecond * delta,
    );
    if (playerStamina <= 0.01) {
      playerSprintActive = false;
    }
  } else {
    playerSprintActive = false;
    playerStamina = Math.min(
      playerMaxStamina,
      playerStamina + playerStaminaRegenPerSecond * delta,
    );
  }

  const staminaRatio = Math.max(
    0,
    Math.min(1, playerStamina / playerMaxStamina),
  );
  const isLowStamina = staminaRatio < playerSprintThresholdRatio;
  staminaBarFill.style.width = `${staminaRatio * 100}%`;
  staminaBarFill.style.opacity = "1";
  staminaBarFill.style.background = isLowStamina
    ? "linear-gradient(90deg, #ffe9a8 0%, #ffb153 38%, #ff7d5f 100%)"
    : "linear-gradient(90deg, #e9f3ff 0%, #94d9ff 33%, #74d5b1 72%, #a8f0b8 100%)";
  staminaBarFill.style.boxShadow = isLowStamina
    ? "0 0 12px rgba(255, 146, 91, 0.8)"
    : "0 0 14px rgba(134, 210, 145, 0.8)";

  return { playerStamina, playerSprintActive };
}
