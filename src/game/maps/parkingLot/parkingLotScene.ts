import * as THREE from "three";

export function prepareParkingLotScene(
  parkingLot: THREE.Object3D,
  isCollisionSurface: (object: THREE.Object3D) => boolean,
  addParkingObstacle: (bounds: THREE.Box3) => void,
): THREE.Box3 {
  parkingLot.updateMatrixWorld(true);
  const initialBounds = new THREE.Box3().setFromObject(parkingLot);
  const initialSize = initialBounds.getSize(new THREE.Vector3());
  const scale = 180 / Math.max(initialSize.x, initialSize.z, 1);
  parkingLot.scale.setScalar(scale);
  parkingLot.updateMatrixWorld(true);

  const scaledBounds = new THREE.Box3().setFromObject(parkingLot);
  const center = scaledBounds.getCenter(new THREE.Vector3());
  parkingLot.position.x -= center.x;
  parkingLot.position.z -= center.z;
  parkingLot.position.y -= scaledBounds.min.y;
  parkingLot.updateMatrixWorld(true);

  parkingLot.traverse((object) => {
    if (object instanceof THREE.Light) object.visible = false;
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = false;
    object.receiveShadow = false;
    if (isCollisionSurface(object)) {
      const obstacleBounds = new THREE.Box3().setFromObject(object);
      const obstacleSize = obstacleBounds.getSize(new THREE.Vector3());
      if (
        obstacleSize.y >= 3 &&
        obstacleSize.y <= 8 &&
        obstacleSize.x > 0.2 &&
        obstacleSize.z > 0.2
      )
        addParkingObstacle(obstacleBounds);
    }
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => {
      if ("color" in material)
        (material as { color: THREE.Color }).color.multiplyScalar(0.35);
      if (
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      ) {
        material.metalness = 0;
        material.roughness = 1;
        material.envMapIntensity = 0;
      }
      if (material instanceof THREE.MeshPhongMaterial) material.shininess = 0;
    });
  });

  return new THREE.Box3().setFromObject(parkingLot);
}