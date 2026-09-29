import * as THREE from "three";

const classroomStudentPositions = [
  [1.445, 2.36, 1.928],
  [-0.425, 2.36, 1.93],
  [-4.333, 2.36, 1.852],
  [-5.877, 2.36, 1.882],
  [-5.924, 2.36, -0.763],
  [-4.358, 2.36, -0.867],
  [-0.366, 2.36, -0.752],
  [4.986, 2.36, -0.675],
  [6.602, 2.36, -0.814],
  [6.642, 2.36, -3.559],
  [4.759, 2.36, -3.516],
  [1.462, 2.36, -4.129],
  [-0.277, 2.36, -4.372],
  [-4.225, 2.36, -3.47],
  [-5.92, 2.36, -3.581],
  [-6.078, 2.36, -6.334],
  [-4.069, 2.36, -6.291],
  [-0.444, 2.36, -6.45],
  [1.221, 2.36, -6.554],
  [4.77, 2.36, -6.105],
  [6.4, 2.36, -5.906],
  [6.469, 2.36, -8.982],
  [4.813, 2.36, -8.965],
  [1.541, 2.36, -8.937],
  [-0.345, 2.36, -8.933],
  [-4.448, 2.36, -8.863],
  [-6.189, 2.36, -8.731],
  [6.766, 2.36, 1.963],
  [5.091, 2.36, 1.924],
] as const;

export function placeClassroomStudents(
  template: THREE.Object3D,
  scene: THREE.Scene,
  visible: boolean,
): {
  students: THREE.Object3D[];
  initialRotations: Map<THREE.Object3D, THREE.Quaternion>;
} {
  const students: THREE.Object3D[] = [];
  const initialRotations = new Map<THREE.Object3D, THREE.Quaternion>();
  for (const [x, y, z] of classroomStudentPositions) {
    const student = template.clone(true);
    student.position.set(x, y, z);
    student.visible = visible;
    students.push(student);
    initialRotations.set(student, student.quaternion.clone());
    scene.add(student);
  }
  return { students, initialRotations };
}