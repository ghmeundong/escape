import * as THREE from "three";

export function findClassroomTeacherClonePosition(params: {
  sourcePosition: THREE.Vector3;
  floorY: number;
  bounds: THREE.Box3 | null;
  existingPositions: THREE.Vector3[];
  routeSide: number;
}): THREE.Vector3 {
  const maxRadius = params.bounds
    ? params.bounds.getSize(new THREE.Vector3()).length()
    : 60;
  for (let radius = 1.5; radius <= maxRadius; radius += 0.75) {
    const sampleCount = Math.max(8, Math.ceil((Math.PI * 2 * radius) / 0.75));
    for (let sample = 0; sample < sampleCount; sample += 1) {
      const angle = (sample / sampleCount) * Math.PI * 2;
      const candidate = new THREE.Vector3(
        params.sourcePosition.x + Math.cos(angle) * radius,
        params.floorY,
        params.sourcePosition.z + Math.sin(angle) * radius,
      );
      if (
        params.bounds &&
        (candidate.x < params.bounds.min.x ||
          candidate.x > params.bounds.max.x ||
          candidate.z < params.bounds.min.z ||
          candidate.z > params.bounds.max.z)
      )
        continue;
      if (
        params.existingPositions.some(
          (position) => position.distanceToSquared(candidate) < 9,
        )
      )
        continue;
      return candidate;
    }
  }
  return new THREE.Vector3(
    params.sourcePosition.x + (params.routeSide < 0 ? 6 : -6),
    params.floorY,
    params.sourcePosition.z,
  );
}
