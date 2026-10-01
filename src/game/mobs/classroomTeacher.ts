import * as THREE from "three";
import { gsap } from "gsap";

export interface ClassroomTeacherTurnAgent {
  object: THREE.Object3D;
  initialQuaternion: THREE.Quaternion;
  classroomTurned: boolean;
  classroomTurnUntil: number;
  classroomNextTurnAt: number;
  cooldownScale: number;
}

export function updateClassroomTeacherCloneTurn(params: {
  teacher: ClassroomTeacherTurnAgent;
  now: number;
  turnDelayMin: number;
  turnDelayMax: number;
  lookDurationMin: number;
  lookDurationMax: number;
  random?: () => number;
}): void {
  const {
    teacher,
    now,
    turnDelayMin,
    turnDelayMax,
    lookDurationMin,
    lookDurationMax,
    random = Math.random,
  } = params;
  if (!teacher.classroomTurned && now >= teacher.classroomNextTurnAt) {
    teacher.object.quaternion.copy(teacher.initialQuaternion);
    teacher.object.rotateY(Math.PI);
    teacher.classroomTurned = true;
    teacher.classroomTurnUntil =
      now +
      (lookDurationMin + random() * (lookDurationMax - lookDurationMin)) *
        teacher.cooldownScale;
    return;
  }
  if (teacher.classroomTurned && now >= teacher.classroomTurnUntil) {
    teacher.object.quaternion.copy(teacher.initialQuaternion);
    teacher.classroomTurned = false;
    teacher.classroomNextTurnAt =
      now +
      (turnDelayMin + random() * (turnDelayMax - turnDelayMin)) *
        teacher.cooldownScale;
  }
}

export function knockDownClassroomStudent(params: {
  student: THREE.Object3D;
  now: number;
  deadStudents: Set<THREE.Object3D>;
  knockdownUntil: Map<THREE.Object3D, number>;
  alertStudents: (now: number) => void;
  impactDirection?: THREE.Vector3;
}): void {
  const {
    student,
    now,
    deadStudents,
    knockdownUntil,
    alertStudents,
    impactDirection,
  } = params;
  if (deadStudents.has(student)) return;
  deadStudents.add(student);
  knockdownUntil.set(student, Infinity);
  alertStudents(now);
  gsap.killTweensOf(student.rotation);
  gsap.killTweensOf(student.quaternion);
  const direction =
    impactDirection?.clone().normalize() ?? new THREE.Vector3(0, 0, 1);
  direction.y = 0;
  direction.normalize();
  const fallAxis = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
  const fallQuaternion = new THREE.Quaternion().setFromAxisAngle(
    fallAxis,
    -Math.PI / 2,
  );
  const targetQuaternion = student.quaternion
    .clone()
    .premultiply(fallQuaternion);
  gsap.to(student.quaternion, {
    x: targetQuaternion.x,
    y: targetQuaternion.y,
    z: targetQuaternion.z,
    w: targetQuaternion.w,
    duration: 0.18,
    ease: "power2.out",
  });
}

export function updateClassroomStudentFacing(params: {
  classroomActive: boolean;
  seatActive: boolean;
  studentsAlerted: boolean;
  students: THREE.Object3D[];
  deadStudents: ReadonlySet<THREE.Object3D>;
  cameraPosition: THREE.Vector3;
  now: number;
  alertStudents: (now: number) => void;
}): void {
  const {
    classroomActive,
    seatActive,
    studentsAlerted,
    students,
    deadStudents,
    cameraPosition,
    now,
    alertStudents,
  } = params;
  if (!classroomActive) return;
  if (!seatActive) alertStudents(now);
  if (seatActive && !studentsAlerted) return;
  students.forEach((student) => {
    if (deadStudents.has(student)) return;
    student.lookAt(cameraPosition.x, student.position.y, cameraPosition.z);
  });
}

export function areAllClassroomStudentsWatching(params: {
  students: THREE.Object3D[];
  cameraPosition: THREE.Vector3;
  maxDistance: number;
  lookDirection: THREE.Vector3;
  toPlayerDirection: THREE.Vector3;
}): boolean {
  const {
    students,
    cameraPosition,
    maxDistance,
    lookDirection,
    toPlayerDirection,
  } = params;
  return students.every((student) => {
    if (
      !student.visible ||
      student.position.distanceTo(cameraPosition) > maxDistance
    )
      return false;
    student.getWorldDirection(lookDirection);
    toPlayerDirection.copy(cameraPosition).sub(student.position).normalize();
    return (
      lookDirection.dot(toPlayerDirection) >= 0.2 ||
      lookDirection.clone().negate().dot(toPlayerDirection) >= 0.92
    );
  });
}
