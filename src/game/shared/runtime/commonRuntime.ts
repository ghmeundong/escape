import type { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

export const PLAYER_MAX_STAMINA = 220;
export const PLAYER_JUMP_STAMINA_COST = 22;
export const PLAYER_STAMINA_DRAIN_PER_SECOND = 34;
export const PLAYER_STAMINA_REGEN_PER_SECOND = 22;

export function tickPlayerStaminaRuntime(params: {
  delta: number;
  isGrounded: boolean;
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
    isGrounded,
    controls,
    keys,
    trueCarEntered,
    startScreen,
    weaponReloading,
    playerStamina: currentStamina,
    playerSprintActive: currentSprint,
    staminaBarFill,
  } = params;

  const sprintModifierHeld = keys.has("ShiftLeft") || keys.has("ShiftRight");
  const sprintPressed =
    controls.isLocked &&
    !trueCarEntered &&
    !startScreen.classList.contains("is-visible") &&
    keys.has("KeyW") &&
    !weaponReloading &&
    sprintModifierHeld;

  const playerMaxStamina = PLAYER_MAX_STAMINA;
  const playerSprintThresholdRatio = 0.3;
  const playerSprintThreshold = playerMaxStamina * playerSprintThresholdRatio;

  let playerStamina = currentStamina;
  let playerSprintActive = currentSprint;
  const canSprint =
    playerStamina > 0.01 &&
    (playerSprintActive || playerStamina >= playerSprintThreshold);

  if (!isGrounded) {
    // Keep stamina unchanged while airborne.
  } else if (!sprintPressed) {
    playerSprintActive = false;
    playerStamina = Math.min(
      playerMaxStamina,
      playerStamina + PLAYER_STAMINA_REGEN_PER_SECOND * delta,
    );
  } else if (canSprint) {
    playerSprintActive = true;
    playerStamina = Math.max(
      0,
      playerStamina - PLAYER_STAMINA_DRAIN_PER_SECOND * delta,
    );
    if (playerStamina <= 0.01) {
      playerSprintActive = false;
    }
  } else {
    playerSprintActive = false;
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
    ? "0 0 0.75rem rgba(255, 146, 91, 0.8)"
    : "0 0 0.875rem rgba(134, 210, 145, 0.8)";

  return { playerStamina, playerSprintActive };
}
