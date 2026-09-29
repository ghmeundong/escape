export type EpisodeId = "parking-lot" | "classroom" | "chess";

export const EPISODE_STORAGE_KEY = "escape-current-episode";

export const EPISODE_LABELS: Record<EpisodeId, string> = {
  "parking-lot": "Parking lot",
  classroom: "Classroom",
  chess: "Chess",
};

export function resolveEpisodeId(value?: string | null): EpisodeId {
  if (value === "classroom") return "classroom";
  if (value === "chess") return "chess";
  return "parking-lot";
}

export function getStoredEpisodeId(): EpisodeId {
  if (typeof localStorage === "undefined") return "parking-lot";
  return resolveEpisodeId(localStorage.getItem(EPISODE_STORAGE_KEY));
}

export function setStoredEpisodeId(episodeId: EpisodeId): EpisodeId {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(EPISODE_STORAGE_KEY, episodeId);
  }
  return episodeId;
}
