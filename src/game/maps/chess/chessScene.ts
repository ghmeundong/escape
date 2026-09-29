import * as THREE from "three";

export type ChessSceneSetup = {
  bounds: THREE.Box3;
  spawnPosition: THREE.Vector3;
  entryPosition: THREE.Vector3;
};

export function prepareChessScene(
  chess: THREE.Object3D,
  lightRig: THREE.Group,
  playerHeight: number,
): ChessSceneSetup {
  chess.updateMatrixWorld(true);
  const initialBounds = new THREE.Box3().setFromObject(chess);
  const initialSize = initialBounds.getSize(new THREE.Vector3());
  chess.scale.setScalar(200 / Math.max(initialSize.x, initialSize.z, 1));
  chess.updateMatrixWorld(true);

  const scaledBounds = new THREE.Box3().setFromObject(chess);
  const center = scaledBounds.getCenter(new THREE.Vector3());
  chess.position.x = -center.x;
  chess.position.z = -center.z;
  chess.position.y -= scaledBounds.min.y;
  chess.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(chess);
  const spawnX = -99.528;
  const spawnZ = 2.488;
  const floorRaycaster = new THREE.Raycaster(
    new THREE.Vector3(spawnX, bounds.max.y + 10, spawnZ),
    new THREE.Vector3(0, -1, 0),
  );
  const floorHit = floorRaycaster
    .intersectObject(chess, true)
    .find((hit) => hit.point.y >= bounds.min.y - 0.25);
  const spawnFloorY = floorHit?.point.y ?? bounds.min.y;
  const spawnPosition = new THREE.Vector3(
    spawnX,
    spawnFloorY + playerHeight + 0.15,
    spawnZ,
  );
  const entryPosition = new THREE.Vector3(
    spawnPosition.x + 1,
    spawnPosition.y,
    spawnPosition.z,
  );

  const hemisphereLight = new THREE.HemisphereLight("#f1e8d4", "#15110d", 1.5);
  const keyLight = new THREE.DirectionalLight("#fff1cf", 2.4);
  keyLight.position.set(-40, 70, 35);
  keyLight.target.position.set(0, 0, 0);
  lightRig.add(hemisphereLight, keyLight, keyLight.target);
  chess.visible = false;

  return { bounds, spawnPosition, entryPosition };
}
