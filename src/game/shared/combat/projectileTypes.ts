import * as THREE from "three";

export type ProjectileMobTarget = {
  object: THREE.Object3D;
  knockedDownAt: number;
};

export type ProjectileMapHits<Mob extends ProjectileMobTarget = ProjectileMobTarget> = {
  surface?: THREE.Intersection<THREE.Object3D>;
  matryoshka?: {
    mob: Mob;
    hit: THREE.Intersection<THREE.Object3D>;
  };
  classroomStudent?: {
    student: THREE.Object3D;
    hit: THREE.Intersection<THREE.Object3D>;
  };
};

export type ProjectileMapQuery = {
  raycaster: THREE.Raycaster;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  maxDistance: number;
  projectileRadius: number;
  isCollisionSurface: (object: THREE.Object3D) => boolean;
};