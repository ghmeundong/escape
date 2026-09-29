import * as THREE from "three";
import type {
  ProjectileMapHits,
  ProjectileMapQuery,
  ProjectileMobTarget,
} from "../../shared/combat/projectileTypes";

export function findClassroomProjectileHits<Mob extends ProjectileMobTarget>(
  query: ProjectileMapQuery & {
    classroomRoot: THREE.Object3D | null;
    students: THREE.Object3D[];
    deadStudents: ReadonlySet<THREE.Object3D>;
    matryoshkaMobs: Mob[];
  },
): ProjectileMapHits<Mob> {
  const { raycaster } = query;
  const surface = query.classroomRoot
    ? raycaster
        .intersectObject(query.classroomRoot, true)
        .find((hit) => query.isCollisionSurface(hit.object))
    : undefined;

  let classroomStudent: ProjectileMapHits["classroomStudent"];
  for (const student of query.students) {
    if (query.deadStudents.has(student)) continue;
    student.updateWorldMatrix(true, true);
    const hit = raycaster.intersectObject(student, true)[0];
    if (!hit || (classroomStudent && hit.distance >= classroomStudent.hit.distance))
      continue;
    classroomStudent = { student, hit };
  }

  let matryoshka: ProjectileMapHits<Mob>["matryoshka"];
  for (const mob of query.matryoshkaMobs) {
    if (mob.knockedDownAt > 0) continue;
    mob.object.updateWorldMatrix(true, true);
    const hit = raycaster.intersectObject(mob.object, true)[0];
    if (!hit || (matryoshka && hit.distance >= matryoshka.hit.distance))
      continue;
    matryoshka = { mob, hit };
  }

  return { surface, classroomStudent, matryoshka };
}