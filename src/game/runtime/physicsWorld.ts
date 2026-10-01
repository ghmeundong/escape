import RAPIER from "@dimforge/rapier3d-compat";

export function createSharedPhysicsWorld(): RAPIER.World {
  const physicsWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  physicsWorld.createCollider(
    RAPIER.ColliderDesc.cuboid(1000, 0.1, 1000).setTranslation(0, -0.1, 0),
  );
  return physicsWorld;
}
