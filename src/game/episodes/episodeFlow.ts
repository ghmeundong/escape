import * as THREE from "three";

import { setStoredEpisodeId, type EpisodeId } from "./episodes";

export type EpisodeRuntimeDeps = {
  parkingLotRoot: THREE.Object3D | null;
  classroomRoot: THREE.Object3D | null;
  chessRoot: THREE.Object3D | null;
  parkedCars: THREE.Object3D[];
  camera: THREE.PerspectiveCamera;
  classroomSpawnPosition: THREE.Vector3;
  classroomEntryPosition: THREE.Vector3;
  chessSpawnPosition: THREE.Vector3;
  chessEntryPosition: THREE.Vector3;
  closeMenu: () => void;
  lockPointer: () => void;
  gunshotAudioContext: AudioContext;
  heartbeatSoundReady: Promise<void>;
  playHeartbeatSound: () => void;
};

export function restoreEpisodeVisibility(
  episodeId: EpisodeId,
  deps: Pick<
    EpisodeRuntimeDeps,
    "parkingLotRoot" | "classroomRoot" | "chessRoot"
  >,
): void {
  if (episodeId === "classroom") {
    if (deps.parkingLotRoot) deps.parkingLotRoot.visible = false;
    if (deps.classroomRoot) deps.classroomRoot.visible = true;
    if (deps.chessRoot) deps.chessRoot.visible = false;
    return;
  }

  if (episodeId === "chess") {
    if (deps.parkingLotRoot) deps.parkingLotRoot.visible = false;
    if (deps.classroomRoot) deps.classroomRoot.visible = false;
    if (deps.chessRoot) deps.chessRoot.visible = true;
    return;
  }

  if (deps.parkingLotRoot) deps.parkingLotRoot.visible = true;
  if (deps.classroomRoot) deps.classroomRoot.visible = false;
  if (deps.chessRoot) deps.chessRoot.visible = false;
}

export function startEpisode(
  episodeId: EpisodeId,
  deps: EpisodeRuntimeDeps,
): void {
  setStoredEpisodeId(episodeId);

  if (episodeId === "classroom") {
    if (!deps.classroomRoot) return;
    if (deps.parkingLotRoot) deps.parkingLotRoot.visible = false;
    if (deps.chessRoot) deps.chessRoot.visible = false;
    deps.parkedCars.forEach((car) => {
      car.visible = false;
    });
    deps.classroomRoot.visible = true;
    deps.camera.position.copy(deps.classroomSpawnPosition);
    deps.camera.lookAt(deps.classroomEntryPosition);
    deps.camera.updateMatrixWorld(true);
  } else if (episodeId === "chess") {
    if (!deps.chessRoot) return;
    if (deps.parkingLotRoot) deps.parkingLotRoot.visible = false;
    if (deps.classroomRoot) deps.classroomRoot.visible = false;
    deps.parkedCars.forEach((car) => {
      car.visible = false;
    });
    deps.chessRoot.visible = true;
    deps.camera.position.copy(deps.chessSpawnPosition);
    deps.camera.lookAt(deps.chessEntryPosition);
    deps.camera.updateMatrixWorld(true);
  } else {
    if (deps.parkingLotRoot) deps.parkingLotRoot.visible = true;
    if (deps.classroomRoot) deps.classroomRoot.visible = false;
    if (deps.chessRoot) deps.chessRoot.visible = false;
    deps.parkedCars.forEach((car) => {
      car.visible = true;
    });
  }

  deps.closeMenu();
  deps.lockPointer();
  if (deps.gunshotAudioContext.state === "suspended") {
    void deps.gunshotAudioContext.resume();
  }
  void deps.heartbeatSoundReady.then(deps.playHeartbeatSound);
}
