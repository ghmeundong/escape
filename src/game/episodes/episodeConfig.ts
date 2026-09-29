import type { EpisodeId } from "./episodes";

export const EPISODE_ORDER: EpisodeId[] = ["parking-lot", "classroom", "chess"];

export function getEpisodeLoadingLabel(episodeId: EpisodeId): string {
  switch (episodeId) {
    case "classroom":
      return "LOADING CLASSROOM...";
    case "chess":
      return "LOADING CHESS...";
    default:
      return "LOADING PARKING LOT...";
  }
}

export function isEpisodeReady(
  episodeId: EpisodeId,
  deps: {
    parkingLotRoot: unknown | null;
    classroomRoot: unknown | null;
    chessRoot: unknown | null;
  },
): boolean {
  if (episodeId === "classroom") return Boolean(deps.classroomRoot);
  if (episodeId === "chess") return Boolean(deps.chessRoot);
  return true;
}
