import * as THREE from "three";
import type {
  ProjectileMapHits,
  ProjectileMapQuery,
  ProjectileMobTarget,
} from "../../shared/combat/projectileTypes";

export function findParkingLotProjectileHits<
  Mob extends ProjectileMobTarget,
>(
  query: ProjectileMapQuery & {
    parkingLotRoot: THREE.Object3D | null;
    parkedCars: THREE.Object3D[];
    matryoshkaMobs: Mob[];
  },
): ProjectileMapHits<Mob> {
  const { raycaster } = query;
  const rootHit = query.parkingLotRoot
    ? raycaster
        .intersectObject(query.parkingLotRoot, true)
        .find((hit) => query.isCollisionSurface(hit.object))
    : undefined;
  const carHit =
    query.parkedCars.length > 0
      ? raycaster.intersectObjects(query.parkedCars, true)[0]
      : undefined;
  const surface =
    carHit && (!rootHit || carHit.distance < rootHit.distance)
      ? carHit
      : rootHit;

  let matryoshka: ProjectileMapHits<Mob>["matryoshka"];
  for (const mob of query.matryoshkaMobs) {
    if (mob.knockedDownAt > 0) continue;
    const hit = raycaster.intersectObject(mob.object, true)[0];
    if (!hit || (matryoshka && hit.distance >= matryoshka.hit.distance)) continue;
    matryoshka = { mob, hit };
  }

  return { surface, matryoshka };
}