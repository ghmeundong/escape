import * as THREE from "three";

export type StoreSceneSetup = {
  bounds: THREE.Box3;
  spawnPosition: THREE.Vector3;
  entryPosition: THREE.Vector3;
};

export function prepareStoreScene(
  store: THREE.Object3D,
  lightRig: THREE.Group,
  playerHeight: number,
): StoreSceneSetup {
  store.updateMatrixWorld(true);
  const initialBounds = new THREE.Box3().setFromObject(store);
  const initialSize = initialBounds.getSize(new THREE.Vector3());
  store.scale.setScalar(500 / Math.max(initialSize.x, initialSize.z, 1));
  store.updateMatrixWorld(true);

  const scaledBounds = new THREE.Box3().setFromObject(store);
  const center = scaledBounds.getCenter(new THREE.Vector3());
  store.position.x = -center.x;
  store.position.z = -center.z;
  store.position.y -= scaledBounds.min.y;
  store.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(store);
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
    "#f2f5ff",
    "#1b2028",
    1.4,
  );
  const keyLight = new THREE.DirectionalLight("#fff8e8", 2.2);
  keyLight.position.set(-120, 240, 150);
  keyLight.target.position.set(0, 0, 0);
  lightRig.add(hemisphereLight, keyLight, keyLight.target);
  store.visible = false;

  return { bounds, spawnPosition, entryPosition };
}