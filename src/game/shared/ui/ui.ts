export function bindScreenFlow(
  startScreen: HTMLElement,
  episodeScreen: HTMLElement,
  settingsOverlay: HTMLElement,
  settingsContent: HTMLElement,
  menuHome: HTMLElement,
  modeMenu: HTMLElement,
): {
  showMenuView: (view: "home" | "mode" | "settings") => void;
  getActiveMenuView: () => "home" | "mode" | "settings";
  openMenu: () => void;
  closeMenu: () => void;
  returnToHome: () => void;
} {
  let activeMenuView: "home" | "mode" | "settings" = "home";

  const showMenuView = (view: "home" | "mode" | "settings"): void => {
    activeMenuView = view;
    menuHome.classList.toggle("is-visible", view === "home");
    modeMenu.classList.toggle("is-visible", view === "mode");
    settingsContent.classList.toggle("is-visible", view === "settings");
  };

  const openMenu = (): void => {
    if (settingsOverlay.classList.contains("is-open")) return;
    showMenuView("home");
    settingsOverlay.classList.add("is-open");
    settingsOverlay.setAttribute("aria-hidden", "false");
  };

  const closeMenu = (): void => {
    settingsOverlay.classList.remove("is-open");
    settingsOverlay.setAttribute("aria-hidden", "true");
  };

  const returnToHome = (): void => {
    startScreen.classList.add("is-visible");
    episodeScreen.classList.remove("is-visible");
    closeMenu();
  };

  return {
    showMenuView,
    getActiveMenuView: () => activeMenuView,
    openMenu,
    closeMenu,
    returnToHome,
  };
}

export function bindEpisodeSelection(
  startScreen: HTMLElement,
  startPlayButton: HTMLButtonElement,
  episodeScreen: HTMLElement,
  parkingLotEpisodeButton: HTMLButtonElement,
  classroomEpisodeButton: HTMLButtonElement,
  chessEpisodeButton: HTMLButtonElement,
  startEpisode: (episodeId: "parking-lot" | "classroom" | "chess") => void,
): void {
  startPlayButton.addEventListener("click", () => {
    startScreen.classList.remove("is-visible");
    episodeScreen.classList.add("is-visible");
  });

  parkingLotEpisodeButton.addEventListener("click", () =>
    startEpisode("parking-lot"),
  );
  classroomEpisodeButton.addEventListener("click", () =>
    startEpisode("classroom"),
  );
  chessEpisodeButton.addEventListener("click", () => startEpisode("chess"));
}

export function bindPauseMenuControls(params: {
  startScreen: HTMLElement;
  episodeScreen: HTMLElement;
  settingsButton: HTMLButtonElement;
  settingsClose: HTMLButtonElement;
  settingsOverlay: HTMLElement;
  menuSettingsButton: HTMLButtonElement;
  menuExitButton: HTMLButtonElement;
  fullscreenButton: HTMLButtonElement;
  showSettings: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  isGameplayStarted: () => boolean;
  lockPointer: () => void;
  exitApplication: () => void;
  returnToEpisodeSelect: () => void;
  toggleFullscreen: () => Promise<void>;
}): void {
  const {
    startScreen,
    episodeScreen,
    settingsButton,
    settingsClose,
    settingsOverlay,
    menuSettingsButton,
    menuExitButton,
    fullscreenButton,
    showSettings,
    openMenu,
    closeMenu,
    isGameplayStarted,
    lockPointer,
    exitApplication,
    returnToEpisodeSelect,
    toggleFullscreen,
  } = params;

  settingsButton.addEventListener("click", () => {
    if (
      startScreen.classList.contains("is-visible") ||
      episodeScreen.classList.contains("is-visible")
    ) {
      showSettings();
      settingsOverlay.classList.add("is-open");
      settingsOverlay.setAttribute("aria-hidden", "false");
    } else openMenu();
  });
  settingsClose.addEventListener("click", () => {
    const isInGameplay =
      isGameplayStarted() &&
      !startScreen.classList.contains("is-visible") &&
      !episodeScreen.classList.contains("is-visible");
    closeMenu();
    if (isInGameplay) lockPointer();
  });
  menuSettingsButton.addEventListener("click", showSettings);
  menuExitButton.addEventListener("click", () => {
    if (startScreen.classList.contains("is-visible")) exitApplication();
    else returnToEpisodeSelect();
  });
  settingsOverlay.addEventListener("click", (event) => {
    if (event.target === settingsOverlay) settingsClose.click();
  });
  fullscreenButton.addEventListener("click", () => {
    void toggleFullscreen();
  });
}
