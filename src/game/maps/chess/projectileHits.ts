import * as THREE from "three";
import type {
  ProjectileMapQuery,
  ProjectileMapHits,
} from "../../shared/combat/projectileTypes";

export function findChessProjectileSurfaceHit(
  query: ProjectileMapQuery & { chessRoot: THREE.Object3D | null },
): ProjectileMapHits["surface"] {
  if (!query.chessRoot) return undefined;
  return query.raycaster
    .intersectObject(query.chessRoot, true)
    .find((hit) => query.isCollisionSurface(hit.object));
}
