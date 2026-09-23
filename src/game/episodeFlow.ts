import * as THREE from "three";

import { setStoredEpisodeId, type EpisodeId } from "./episodes";

export type EpisodeRuntimeDeps = {
  parkingLotRoot: THREE.Object3D | null;
  classroomRoot: THREE.Object3D | null;
  storeRoot: THREE.Object3D | null;
  parkedCars: THREE.Object3D[];
  camera: THREE.PerspectiveCamera;
  classroomSpawnPosition: THREE.Vector3;
  classroomEntryPosition: THREE.Vector3;
  storeSpawnPosition: THREE.Vector3;
  storeEntryPosition: THREE.Vector3;
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
    "parkingLotRoot" | "classroomRoot" | "storeRoot"
  >,
): void {
  if (episodeId === "classroom") {
    if (deps.parkingLotRoot) deps.parkingLotRoot.visible = false;
    if (deps.classroomRoot) deps.classroomRoot.visible = true;
    if (deps.storeRoot) deps.storeRoot.visible = false;
    return;
  }

  if (episodeId === "store") {
    if (deps.parkingLotRoot) deps.parkingLotRoot.visible = false;
    if (deps.classroomRoot) deps.classroomRoot.visible = false;
    if (deps.storeRoot) deps.storeRoot.visible = true;
    return;
  }

  if (deps.parkingLotRoot) deps.parkingLotRoot.visible = true;
  if (deps.classroomRoot) deps.classroomRoot.visible = false;
  if (deps.storeRoot) deps.storeRoot.visible = false;
}

export function startEpisode(
  episodeId: EpisodeId,
  deps: EpisodeRuntimeDeps,
): void {
  setStoredEpisodeId(episodeId);

  if (episodeId === "classroom") {
    if (!deps.classroomRoot) return;
    if (deps.parkingLotRoot) deps.parkingLotRoot.visible = false;
    if (deps.storeRoot) deps.storeRoot.visible = false;
    deps.parkedCars.forEach((car) => {
      car.visible = false;
    });
    deps.classroomRoot.visible = true;
    deps.camera.position.copy(deps.classroomSpawnPosition);
    deps.camera.lookAt(deps.classroomEntryPosition);
    deps.camera.updateMatrixWorld(true);
  } else if (episodeId === "store") {
    if (!deps.storeRoot) return;
    if (deps.parkingLotRoot) deps.parkingLotRoot.visible = false;
    if (deps.classroomRoot) deps.classroomRoot.visible = false;
    deps.parkedCars.forEach((car) => {
      car.visible = false;
    });
    deps.storeRoot.visible = true;
    deps.camera.position.copy(deps.storeSpawnPosition);
    deps.camera.lookAt(deps.storeEntryPosition);
    deps.camera.updateMatrixWorld(true);
  } else {
    if (deps.parkingLotRoot) deps.parkingLotRoot.visible = true;
    if (deps.classroomRoot) deps.classroomRoot.visible = false;
    if (deps.storeRoot) deps.storeRoot.visible = false;
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
