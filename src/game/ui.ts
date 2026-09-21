export function bindScreenFlow(
  startScreen: HTMLElement,
  episodeScreen: HTMLElement,
  settingsOverlay: HTMLElement,
  settingsContent: HTMLElement,
  menuHome: HTMLElement,
  modeMenu: HTMLElement,
): {
  showMenuView: (view: "home" | "mode" | "settings") => void;  getActiveMenuView: () => "home" | "mode" | "settings";  openMenu: () => void;
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
  storeEpisodeButton: HTMLButtonElement,
  startEpisode: (episodeId: "parking-lot" | "store") => void,
): void {
  startPlayButton.addEventListener("click", () => {
    startScreen.classList.remove("is-visible");
    episodeScreen.classList.add("is-visible");
  });

  parkingLotEpisodeButton.addEventListener("click", () =>
    startEpisode("parking-lot"),
  );
  storeEpisodeButton.addEventListener("click", () => startEpisode("store"));
}
