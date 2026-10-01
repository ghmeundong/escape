import { PLAYER_MAX_STAMINA } from "../shared/runtime/commonRuntime";
import type { EpisodeId } from "../episodes/episodes";

export type CurrentWeaponId = "pistol";

export interface GameState {
  isPaused: boolean;
  currentEpisode: EpisodeId;
  currentWeapon: CurrentWeaponId;
  isInClassroom: boolean;
  isInChess: boolean;
  gameplayStarted: boolean;
  episodeEntryLoading: boolean;
  playerDeathActive: boolean;
  playerDeathElapsed: number;
  weaponAmmo: number;
  weaponPickupCollected: boolean;
  weaponDrawn: boolean;
  weaponHolstering: boolean;
  weaponRaising: boolean;
  playerStamina: number;
  playerSprintActive: boolean;
  playerSprintAcceleration: number;
}

export const gameState: GameState = {
  isPaused: true,
  currentEpisode: "parking-lot",
  currentWeapon: "pistol",
  isInClassroom: false,
  isInChess: false,
  gameplayStarted: false,
  episodeEntryLoading: false,
  playerDeathActive: false,
  playerDeathElapsed: 0,
  weaponAmmo: 0,
  weaponPickupCollected: false,
  weaponDrawn: false,
  weaponHolstering: false,
  weaponRaising: false,
  playerStamina: PLAYER_MAX_STAMINA,
  playerSprintActive: false,
  playerSprintAcceleration: 0,
};
