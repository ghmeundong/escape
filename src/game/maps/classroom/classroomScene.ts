import * as THREE from "three";

export type ClassroomSceneSetup = {
  bounds: THREE.Box3;
  obstacles: THREE.Box3[];
  spawnPosition: THREE.Vector3;
  entryPosition: THREE.Vector3;
  matryoshkaSpawn: THREE.Vector3;
};

export function prepareClassroomScene(
  classroom: THREE.Object3D,
  scene: THREE.Scene,
  lightRig: THREE.Group,
  playerHeight: number,
  isCollisionSurface: (object: THREE.Object3D) => boolean,
): ClassroomSceneSetup {
  classroom.updateMatrixWorld(true);
  const initialBounds = new THREE.Box3().setFromObject(classroom);
  const initialSize = initialBounds.getSize(new THREE.Vector3());
  classroom.scale.setScalar(25 / Math.max(initialSize.x, initialSize.z, 1));
  classroom.updateMatrixWorld(true);

  const scaledBounds = new THREE.Box3().setFromObject(classroom);
  const center = scaledBounds.getCenter(new THREE.Vector3());
  classroom.position.x = -center.x;
  classroom.position.z = -center.z;
  classroom.position.y -= scaledBounds.min.y;
  classroom.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(classroom);
  const obstacles: THREE.Box3[] = [];
  classroom.traverse((object) => {
    if (!isCollisionSurface(object)) return;
    const objectBounds = new THREE.Box3().setFromObject(object);
    const size = objectBounds.getSize(new THREE.Vector3());
    if (
      size.x < 0.2 ||
      size.z < 0.2 ||
      size.y < 0.25 ||
      size.y > 5.5
    )
      return;
    obstacles.push(objectBounds);
  });

  const floorY = bounds.min.y;
  const worldCenter = bounds.getCenter(new THREE.Vector3());
  const spawnPosition = new THREE.Vector3(
    worldCenter.x,
    floorY + playerHeight,
    worldCenter.z,
  );
  const entrySize = bounds.getSize(new THREE.Vector3());
  const entryPosition = new THREE.Vector3(
    bounds.min.x + Math.min(1.2, entrySize.x * 0.12),
    floorY + playerHeight,
    (bounds.min.z + bounds.max.z) * 0.5,
  );

  const hemisphereLight = new THREE.HemisphereLight(
    "#edf5ff",
    "#181d25",
    1.3,
  );
  const keyLight = new THREE.DirectionalLight("#fff2d8", 1.8);
  keyLight.position.set(-80, 120, 90);
  keyLight.target.position.set(0, 0, 0);
  lightRig.add(hemisphereLight, keyLight, keyLight.target);
  classroom.visible = false;
  scene.add(classroom);

  return {
    bounds,
    obstacles,
    spawnPosition,
    entryPosition,
    matryoshkaSpawn: new THREE.Vector3(4.081, 0.125, 9.398),
  };
}