import * as THREE from "three";

export function findParkingLotClonePosition(params: {
  source: THREE.Object3D;
  existing: THREE.Object3D[];
  overlapsVehicle: (x: number, z: number) => boolean;
  getGround: (x: number, z: number) => THREE.Intersection | undefined;
}): THREE.Vector3 {
  const candidateOffsets = [
    new THREE.Vector3(4, 0, 0),
    new THREE.Vector3(-4, 0, 0),
    new THREE.Vector3(0, 0, 4),
    new THREE.Vector3(0, 0, -4),
  ];
  let spawnPosition = params.source.position.clone();
  for (const offset of candidateOffsets) {
    const candidate = params.source.position.clone().add(offset);
    if (params.overlapsVehicle(candidate.x, candidate.z)) continue;
    if (
      params.existing.some(
        (mob) =>
          mob !== params.source &&
          mob.position.distanceToSquared(candidate) < 6.25,
      )
    )
      continue;
    const ground = params.getGround(candidate.x, candidate.z);
    if (!ground) continue;
    spawnPosition = new THREE.Vector3(candidate.x, ground.point.y, candidate.z);
    break;
  }
  return spawnPosition;
}
