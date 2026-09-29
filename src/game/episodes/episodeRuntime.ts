import type { EpisodeId } from "./episodes";
import { startEpisode, type EpisodeRuntimeDeps } from "./episodeFlow";

type EpisodeEntryControllerParams = {
  startScreen: HTMLElement;
  episodeScreen: HTMLElement;
  range: HTMLElement;
  showLoadingScreen: (label: string, percent?: number) => void;
  hideLoadingScreen: (force?: boolean) => void;
  setEpisodeEntryLoading: (loading: boolean) => void;
  setGameplayStarted: () => void;
  setEpisodeFlags: (episodeId: EpisodeId) => void;
  syncEpisodeOnlyObjects: () => void;
  onEpisodeStarted: (episodeId: EpisodeId) => void;
  getStartEpisodeDeps: () => EpisodeRuntimeDeps;
};

export function createEpisodeEntryController(
  params: EpisodeEntryControllerParams,
): (episodeId: EpisodeId) => void {
  let episodeEntryLoading = false;

  const finishEpisodeEntryLoading = (): void => {
    requestAnimationFrame(() => {
      params.showLoadingScreen("LOADING OBJECTS...", 60);
      requestAnimationFrame(() => {
        params.showLoadingScreen("LOADING OBJECTS...", 100);
        requestAnimationFrame(() => {
          episodeEntryLoading = false;
          params.setEpisodeEntryLoading(false);
          params.range.classList.remove("is-enter-loading");
          params.hideLoadingScreen(true);
        });
      });
    });
  };

  return (episodeId: EpisodeId): void => {
    if (episodeEntryLoading) return;
    episodeEntryLoading = true;
    params.setEpisodeEntryLoading(true);
    params.setGameplayStarted();
    const startEpisodeDeps = params.getStartEpisodeDeps();
    const loadingLabel =
      episodeId === "store"
        ? "LOADING STORE..."
        : episodeId === "classroom"
          ? "LOADING CLASSROOM..."
          : "LOADING PARKING LOT...";

    params.showLoadingScreen(loadingLabel, 15);
    params.range.classList.add("is-enter-loading");
    params.startScreen.classList.remove("is-visible");
    params.episodeScreen.classList.remove("is-visible");
    params.setEpisodeFlags(episodeId);

    const beginEpisode = (): void => {
      if (episodeId === "classroom" && !startEpisodeDeps.classroomRoot) {
        params.showLoadingScreen(loadingLabel, 80);
        requestAnimationFrame(beginEpisode);
        return;
      }
      if (episodeId === "store" && !startEpisodeDeps.storeRoot) {
        params.showLoadingScreen(loadingLabel, 80);
        requestAnimationFrame(beginEpisode);
        return;
      }

      startEpisode(episodeId, startEpisodeDeps);
      params.syncEpisodeOnlyObjects();
      params.onEpisodeStarted(episodeId);
      finishEpisodeEntryLoading();
    };

    beginEpisode();
  };
}
