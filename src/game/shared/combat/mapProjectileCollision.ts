import * as THREE from "three";
import type { EpisodeId } from "../../episodes/episodes";
import { findClassroomProjectileHits } from "../../maps/classroom/projectileHits";
import { findParkingLotProjectileHits } from "../../maps/parkingLot/projectileHits";
import { findStoreProjectileSurfaceHit } from "../../maps/store/projectileHits";
import type {
  ProjectileMapHits,
  ProjectileMapQuery,
  ProjectileMobTarget,
} from "./projectileTypes";

export function findMapProjectileHits<Mob extends ProjectileMobTarget>(params: {
  episodeId: EpisodeId;
  raycaster: THREE.Raycaster;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  maxDistance: number;
  projectileRadius: number;
  parkingLotRoot: THREE.Object3D | null;
  classroomRoot: THREE.Object3D | null;
  storeRoot: THREE.Object3D | null;
  parkedCars: THREE.Object3D[];
  matryoshkaMobs: Mob[];
  classroomStudents: THREE.Object3D[];
  deadStudents: ReadonlySet<THREE.Object3D>;
  isCollisionSurface: (object: THREE.Object3D) => boolean;
}): ProjectileMapHits<Mob> {
  const query: ProjectileMapQuery = {
    raycaster: params.raycaster,
    origin: params.origin,
    direction: params.direction,
    maxDistance: params.maxDistance,
    projectileRadius: params.projectileRadius,
    isCollisionSurface: params.isCollisionSurface,
  };
  query.raycaster.set(query.origin, query.direction);
  query.raycaster.far = query.maxDistance + query.projectileRadius;

  if (params.episodeId === "classroom") {
    const hits = findClassroomProjectileHits({
      ...query,
      classroomRoot: params.classroomRoot,
      students: params.classroomStudents,
      deadStudents: params.deadStudents,
    });
    return {
      surface: hits.surface,
      classroomStudent: hits.classroomStudent,
    };
  }

  if (params.episodeId === "store") {
    return {
      surface: findStoreProjectileSurfaceHit({
        ...query,
        storeRoot: params.storeRoot,
      }),
    };
  }

  return findParkingLotProjectileHits({
    ...query,
    parkingLotRoot: params.parkingLotRoot,
    parkedCars: params.parkedCars,
    matryoshkaMobs: params.matryoshkaMobs,
  });
}