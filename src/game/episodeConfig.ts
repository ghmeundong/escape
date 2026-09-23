import type { EpisodeId } from "./episodes";

export const EPISODE_ORDER: EpisodeId[] = ["parking-lot", "classroom", "store"];

export function getEpisodeLoadingLabel(episodeId: EpisodeId): string {
  switch (episodeId) {
    case "classroom":
      return "LOADING CLASSROOM...";
    case "store":
      return "LOADING STORE...";
    default:
      return "LOADING PARKING LOT...";
  }
}

export function isEpisodeReady(
  episodeId: EpisodeId,
  deps: {
    parkingLotRoot: unknown | null;
    classroomRoot: unknown | null;
    storeRoot: unknown | null;
  },
): boolean {
  if (episodeId === "classroom") return Boolean(deps.classroomRoot);
  if (episodeId === "store") return Boolean(deps.storeRoot);
  return true;
}
