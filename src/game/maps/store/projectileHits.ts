import * as THREE from "three";
import type { ProjectileMapQuery } from "../../shared/combat/projectileTypes";

export function findStoreProjectileSurfaceHit(
  query: ProjectileMapQuery & { storeRoot: THREE.Object3D | null },
): THREE.Intersection<THREE.Object3D> | undefined {
  if (!query.storeRoot) return undefined;
  return query
    .raycaster.intersectObject(query.storeRoot, true)
    .find((hit) => query.isCollisionSurface(hit.object));
}