import * as THREE from "three";
import type {
  ProjectileMapHits,
  ProjectileMapQuery,
} from "../../shared/combat/projectileTypes";

export function findClassroomProjectileHits(
  query: ProjectileMapQuery & {
    classroomRoot: THREE.Object3D | null;
    students: THREE.Object3D[];
    deadStudents: ReadonlySet<THREE.Object3D>;
  },
): ProjectileMapHits {
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

  return { surface, classroomStudent };
}