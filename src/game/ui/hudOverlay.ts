export interface HudOverlayElements {
  keyPickupPrompt: HTMLDivElement;
  vehicleSearchHint: HTMLDivElement;
  classroomDoorProgressRing: HTMLDivElement;
  classroomDoorProgressFill: SVGCircleElement;
  classroomDoorProgressCircumference: number;
  staminaBarFill: HTMLElement;
  weaponPickupPrompt: HTMLDivElement;
  reloadPrompt: HTMLDivElement;
  trueCarPrompt: HTMLDivElement;
  trueCarSoundIndicator: HTMLDivElement;
  classroomSeatPrompt: HTMLDivElement;
  weaponModePrompt: HTMLDivElement;
}

export function renderInteractionPrompts(params: {
  elements: HudOverlayElements;
  mode: "parking-lot" | "classroom" | "chess";
  controlsLocked: boolean;
  weaponPickupCollected: boolean;
  weaponInRange: boolean;
  classroomBackDoorOpening: boolean;
  backDoorInRange: boolean;
  classroomSeatActive: boolean;
  classroomSeatInRange: boolean;
  keyInRange: boolean;
  keyPickupCollected: boolean;
  trueCarInRange: boolean;
}): void {
  const {
    elements,
    mode,
    controlsLocked,
    weaponPickupCollected,
    weaponInRange,
    classroomBackDoorOpening,
    backDoorInRange,
    classroomSeatActive,
    classroomSeatInRange,
    keyInRange,
    keyPickupCollected,
    trueCarInRange,
  } = params;
  elements.weaponModePrompt.hidden = !controlsLocked;
  elements.weaponModePrompt
    .querySelectorAll<HTMLElement>(".weapon-key-hint")
    .forEach((hint) => {
      hint.hidden = !weaponPickupCollected;
    });

  if (mode === "classroom") {
    elements.keyPickupPrompt.hidden = true;
    elements.weaponPickupPrompt.hidden = !weaponInRange;
    elements.trueCarPrompt.hidden = true;
    elements.vehicleSearchHint.textContent = "PRESS [F] TO OPEN BACK DOOR";
    const showBackDoorPrompt = !classroomBackDoorOpening && backDoorInRange;
    elements.vehicleSearchHint.classList.toggle(
      "interaction-prompt",
      showBackDoorPrompt,
    );
    elements.vehicleSearchHint.hidden = !showBackDoorPrompt;
    elements.classroomSeatPrompt.hidden =
      !weaponPickupCollected || !classroomSeatInRange;
    if (classroomSeatActive) {
      elements.vehicleSearchHint.textContent = "PRESS [F] TO STAND UP";
      elements.vehicleSearchHint.hidden = !elements.weaponPickupPrompt.hidden;
    }
    return;
  }

  if (mode === "chess") {
    elements.vehicleSearchHint.classList.remove("interaction-prompt");
    elements.keyPickupPrompt.hidden = true;
    elements.weaponPickupPrompt.hidden = true;
    elements.vehicleSearchHint.hidden = true;
    elements.trueCarPrompt.hidden = true;
    elements.classroomSeatPrompt.hidden = true;
    return;
  }

  elements.vehicleSearchHint.classList.remove("interaction-prompt");
  elements.classroomSeatPrompt.hidden = !classroomSeatInRange;
  elements.keyPickupPrompt.hidden = !keyInRange;
  elements.weaponPickupPrompt.hidden = !weaponInRange;
  elements.vehicleSearchHint.hidden = !keyPickupCollected;
  elements.trueCarPrompt.hidden = !trueCarInRange;
}

export function renderClassroomDoorProgress(
  elements: HudOverlayElements,
  progress: number | null,
): void {
  elements.classroomDoorProgressRing.hidden = progress === null;
  const normalizedProgress = progress ?? 0;
  elements.classroomDoorProgressFill.style.strokeDashoffset = `${elements.classroomDoorProgressCircumference * (1 - normalizedProgress)}`;
}

export function createHudOverlay(range: HTMLElement): HudOverlayElements {
  const keyPickupPrompt = document.createElement("div");
  keyPickupPrompt.className = "interaction-prompt";
  keyPickupPrompt.textContent = "PRESS [F] TO PICK UP KEY";
  keyPickupPrompt.hidden = true;
  range.append(keyPickupPrompt);

  const vehicleSearchHint = document.createElement("div");
  vehicleSearchHint.className = "vehicle-search-hint";
  vehicleSearchHint.textContent = "[P]: PANIC BUTTON";
  vehicleSearchHint.hidden = true;
  range.append(vehicleSearchHint);

  const classroomDoorProgressRing = document.createElement("div");
  classroomDoorProgressRing.className = "classroom-door-progress-ring";
  classroomDoorProgressRing.innerHTML =
    '<svg viewBox="0 0 58 58" aria-hidden="true"><circle class="door-progress-track" cx="29" cy="29" r="24"></circle><circle class="door-progress-fill" cx="29" cy="29" r="24"></circle></svg>';
  const classroomDoorProgressFill =
    classroomDoorProgressRing.querySelector<SVGCircleElement>(
      ".door-progress-fill",
    )!;
  const classroomDoorProgressCircumference = 2 * Math.PI * 24;
  classroomDoorProgressFill.style.strokeDasharray = `${classroomDoorProgressCircumference}`;
  classroomDoorProgressFill.style.strokeDashoffset = `${classroomDoorProgressCircumference}`;
  classroomDoorProgressRing.hidden = true;
  range.append(classroomDoorProgressRing);

  const staminaHud = document.createElement("div");
  staminaHud.className = "stamina-hud";
  staminaHud.innerHTML = `
  <div class="stamina-hud-label-row">
    <span class="stamina-hud-label">STAMINA</span>
    <span class="stamina-hud-hint">HOLD SHIFT TO SPRINT</span>
  </div>
  <div class="stamina-bar"><span id="stamina-bar-fill"></span></div>
`;
  range.append(staminaHud);
  const staminaBarFill =
    staminaHud.querySelector<HTMLElement>("#stamina-bar-fill")!;

  const weaponPickupPrompt = document.createElement("div");
  weaponPickupPrompt.className = "interaction-prompt";
  weaponPickupPrompt.textContent = "PRESS [F] TO PICK UP PISTOL";
  weaponPickupPrompt.hidden = true;
  range.append(weaponPickupPrompt);

  const reloadPrompt = document.createElement("div");
  reloadPrompt.className = "interaction-prompt reload-prompt";
  reloadPrompt.textContent = "PRESS [R] TO RELOAD";
  reloadPrompt.hidden = true;
  range.append(reloadPrompt);

  const trueCarPrompt = document.createElement("div");
  trueCarPrompt.className = "interaction-prompt";
  trueCarPrompt.textContent = "PRESS [F] TO ENTER";
  trueCarPrompt.hidden = true;
  range.append(trueCarPrompt);

  const trueCarSoundIndicator = document.createElement("div");
  trueCarSoundIndicator.className = "true-car-sound-indicator";
  trueCarSoundIndicator.hidden = true;
  range.append(trueCarSoundIndicator);

  const classroomSeatPrompt = document.createElement("div");
  classroomSeatPrompt.className = "interaction-prompt";
  classroomSeatPrompt.textContent = "PRESS [F] TO SIT";
  classroomSeatPrompt.hidden = true;
  range.append(classroomSeatPrompt);

  const weaponModePrompt = document.createElement("div");
  weaponModePrompt.className = "weapon-mode-hud";
  weaponModePrompt.innerHTML =
    '<span class="weapon-key-hint"><b>1</b> DRAW</span><span class="weapon-key-hint"><b>2</b> HOLSTER</span><span><b>F</b> INTERACT</span>';
  weaponModePrompt.hidden = true;
  staminaHud.append(weaponModePrompt);

  return {
    keyPickupPrompt,
    vehicleSearchHint,
    classroomDoorProgressRing,
    classroomDoorProgressFill,
    classroomDoorProgressCircumference,
    staminaBarFill,
    weaponPickupPrompt,
    reloadPrompt,
    trueCarPrompt,
    trueCarSoundIndicator,
    classroomSeatPrompt,
    weaponModePrompt,
  };
}
