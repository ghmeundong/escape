export interface KeyInputState {
  keys: Set<string>;
  add: (code: string) => void;
  delete: (code: string) => void;
  clear: () => void;
}

export function createKeyInputState(): KeyInputState {
  const keys = new Set<string>();
  return {
    keys,
    add: (code) => keys.add(code),
    delete: (code) => keys.delete(code),
    clear: () => keys.clear(),
  };
}

export function bindKeyInputHandlers(
  keyInput: KeyInputState,
  onKeyDown: (event: KeyboardEvent) => void,
): void {
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", (event) => keyInput.delete(event.code));
}

export function handleWeaponHotkey(
  event: KeyboardEvent,
  params: {
    controlsLocked: boolean;
    keyPickupCollected: boolean;
    trueCarEntered: boolean;
    setWeaponDrawn: (drawn: boolean) => void;
    startWeaponReload: () => void;
    playTrueCarSound: () => void;
  },
): boolean {
  const {
    controlsLocked,
    keyPickupCollected,
    trueCarEntered,
    setWeaponDrawn,
    startWeaponReload,
    playTrueCarSound,
  } = params;
  if (event.code === "Digit1" || event.code === "Numpad1") {
    setWeaponDrawn(true);
    return true;
  }
  if (event.code === "Digit2" || event.code === "Numpad2") {
    setWeaponDrawn(false);
    return true;
  }
  if (event.code === "KeyP") {
    if (controlsLocked && keyPickupCollected && !trueCarEntered)
      playTrueCarSound();
    return true;
  }
  if (event.code === "KeyR") {
    if (controlsLocked) startWeaponReload();
    return true;
  }
  return false;
}

export function handleInteractionHotkey(
  event: KeyboardEvent,
  actions: {
    isWeaponWithinPickupRange: () => boolean;
    collectWeaponPickup: () => void;
    isClassroomBackDoorWithinInteractionRange: () => boolean;
    openClassroomBackDoor: () => void;
    classroomSeatActive: boolean;
    isInClassroom: boolean;
    standFromClassroomSeat: () => void;
    isClassroomSeatWithinInteractionRange: () => boolean;
    sitAtClassroomSeat: () => void;
    keyPickupCollected: boolean;
    enterTrueCar: () => void;
    collectKeyPickup: () => void;
  },
): boolean {
  if (event.code !== "KeyF") return false;
  if (actions.isWeaponWithinPickupRange()) actions.collectWeaponPickup();
  else if (actions.isClassroomBackDoorWithinInteractionRange())
    actions.openClassroomBackDoor();
  else if (actions.classroomSeatActive && actions.isInClassroom)
    actions.standFromClassroomSeat();
  else if (actions.isClassroomSeatWithinInteractionRange())
    actions.sitAtClassroomSeat();
  else if (actions.keyPickupCollected) actions.enterTrueCar();
  else actions.collectKeyPickup();
  return true;
}

export function handleEscapeHotkey(
  event: KeyboardEvent,
  actions: {
    startScreen: HTMLElement;
    episodeScreen: HTMLElement;
    settingsOverlay: HTMLElement;
    controlsLocked: boolean;
    electronApp: boolean;
    fullscreenActive: boolean;
    unlockControls: () => void;
    confirmExit: () => void;
    exitFullscreen: () => void;
    getActiveMenuView: () => "home" | "mode" | "settings";
    enterGame: () => void;
    openMenu: () => void;
    closeMenu: () => void;
    showMenuView: (view: "home" | "mode" | "settings") => void;
  },
): boolean {
  if (event.code !== "Escape") return false;
  const {
    startScreen,
    episodeScreen,
    settingsOverlay,
    controlsLocked,
    electronApp,
    fullscreenActive,
    unlockControls,
    confirmExit,
    exitFullscreen,
    getActiveMenuView,
    enterGame,
    openMenu,
    closeMenu,
    showMenuView,
  } = actions;

  if (episodeScreen.classList.contains("is-visible")) {
    event.preventDefault();
    episodeScreen.classList.remove("is-visible");
    startScreen.classList.add("is-visible");
    return true;
  }
  if (startScreen.classList.contains("is-visible")) {
    event.preventDefault();
    confirmExit();
    return true;
  }
  if (controlsLocked) {
    event.preventDefault();
    unlockControls();
    return true;
  }
  if (electronApp) {
    event.preventDefault();
    if (settingsOverlay.classList.contains("is-open")) {
      if (getActiveMenuView() === "home") enterGame();
      else showMenuView("home");
    } else openMenu();
    return true;
  }
  if (fullscreenActive) {
    event.preventDefault();
    exitFullscreen();
    return true;
  }
  event.preventDefault();
  if (!settingsOverlay.classList.contains("is-open")) openMenu();
  else if (getActiveMenuView() === "home") closeMenu();
  else showMenuView("home");
  return true;
}
