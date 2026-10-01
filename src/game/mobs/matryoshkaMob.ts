import * as THREE from "three";

export type MatryoshkaMobState = "wander" | "investigate" | "chase";

export interface MatryoshkaTargetAgent {
  object: THREE.Object3D;
  state: MatryoshkaMobState;
  soundSource: "player" | "car";
  heardSoundVersion: number;
  lastSeenPlayerPosition: THREE.Vector3;
  route: THREE.Vector3[];
  target: THREE.Vector3;
  patrolDestination: THREE.Vector3 | null;
}

export interface MatryoshkaKnockdownAgent extends MatryoshkaTargetAgent {
  velocity: THREE.Vector3;
  knockdownBaseY: number;
  knockedDownAt: number;
  physicsBody: {
    setGravityScale: (scale: number, wakeUp: boolean) => void;
    applyImpulse: (
      impulse: { x: number; y: number; z: number },
      wakeUp: boolean,
    ) => void;
    applyTorqueImpulse: (
      impulse: { x: number; y: number; z: number },
      wakeUp: boolean,
    ) => void;
  };
}

export function getMatryoshkaHorizontalDistanceSquared(
  first: THREE.Vector3,
  second: THREE.Vector3,
): number {
  const deltaX = first.x - second.x;
  const deltaZ = first.z - second.z;
  return deltaX * deltaX + deltaZ * deltaZ;
}

export function knockDownMatryoshkaMob<TMob extends MatryoshkaKnockdownAgent>(
  mob: TMob,
  now: number,
  gravityMultiplier: number,
  impactDirection?: THREE.Vector3,
): void {
  if (mob.knockedDownAt > 0) return;
  mob.knockdownBaseY = mob.object.position.y;
  mob.knockedDownAt = now;
  mob.velocity.set(0, 0, 0);
  mob.route = [];
  const direction =
    impactDirection?.clone().setY(0).normalize() ?? new THREE.Vector3(0, 0, 1);
  mob.physicsBody.setGravityScale(gravityMultiplier, true);
  mob.physicsBody.applyImpulse(
    { x: direction.x * 0.55, y: 0.8, z: direction.z * 0.55 },
    true,
  );
  mob.physicsBody.applyTorqueImpulse(
    { x: direction.z * 0.18, y: 0.05, z: -direction.x * 0.18 },
    true,
  );
}

export function determineMatryoshkaMobState(params: {
  playerVisible: boolean;
  chaseMemoryActive: boolean;
  reachedSound: boolean;
  currentState: MatryoshkaMobState;
}): MatryoshkaMobState {
  const { playerVisible, chaseMemoryActive, reachedSound, currentState } =
    params;
  if (playerVisible || chaseMemoryActive) return "chase";
  if (reachedSound) return "wander";
  return currentState === "investigate" ? "investigate" : "wander";
}

export function chooseMatryoshkaTarget<
  TMob extends MatryoshkaTargetAgent,
>(params: {
  mob: TMob;
  waypoints: THREE.Vector3[];
  positionScratch: THREE.Vector3;
  playerSoundTarget: THREE.Vector3;
  carSoundTarget: THREE.Vector3;
  playerSoundVersion: number;
  carSoundVersion: number;
  isDestinationAvailable: (mob: TMob, waypoint: THREE.Vector3) => boolean;
  isWallPathBlocked: (start: THREE.Vector3, end: THREE.Vector3) => boolean;
}): void {
  const {
    mob,
    waypoints,
    positionScratch,
    playerSoundTarget,
    carSoundTarget,
    playerSoundVersion,
    carSoundVersion,
    isDestinationAvailable,
    isWallPathBlocked,
  } = params;
  mob.object.getWorldPosition(positionScratch);
  if (mob.state !== "wander") mob.patrolDestination = null;

  if (mob.state === "chase") {
    const chaseTarget = mob.lastSeenPlayerPosition.clone();
    mob.route = [chaseTarget];
    mob.target.copy(chaseTarget);
    return;
  }
  if (mob.state === "investigate") {
    const soundTarget =
      mob.soundSource === "player" ? playerSoundTarget : carSoundTarget;
    mob.route = [soundTarget.clone()];
    mob.target.copy(mob.route[0]);
    mob.heardSoundVersion =
      mob.soundSource === "player" ? playerSoundVersion : carSoundVersion;
    return;
  }
  if (waypoints.length === 0) return;

  const candidates = waypoints.filter(
    (waypoint) =>
      getMatryoshkaHorizontalDistanceSquared(waypoint, positionScratch) > 36 &&
      isDestinationAvailable(mob, waypoint) &&
      !isWallPathBlocked(positionScratch, waypoint),
  );
  const farthestCandidate = candidates.reduce<THREE.Vector3 | null>(
    (farthest, waypoint) =>
      !farthest ||
      waypoint.distanceToSquared(positionScratch) >
        farthest.distanceToSquared(positionScratch)
        ? waypoint
        : farthest,
    null,
  );
  const fallbackCandidates = candidates.length > 0 ? candidates : waypoints;
  const fallback =
    farthestCandidate ??
    fallbackCandidates.reduce((farthest, waypoint) =>
      waypoint.distanceToSquared(positionScratch) >
      farthest.distanceToSquared(positionScratch)
        ? waypoint
        : farthest,
    );
  const target = fallback.clone();
  mob.route = [target];
  mob.target.copy(target);
  mob.patrolDestination = target.clone();
}

export function ensureMatryoshkaWanderMovement<
  TMob extends MatryoshkaTargetAgent,
>(params: {
  mob: TMob;
  waypoints: THREE.Vector3[];
  positionScratch: THREE.Vector3;
  isDestinationAvailable: (mob: TMob, waypoint: THREE.Vector3) => boolean;
  isWallPathBlocked: (start: THREE.Vector3, end: THREE.Vector3) => boolean;
}): void {
  const {
    mob,
    waypoints,
    positionScratch,
    isDestinationAvailable,
    isWallPathBlocked,
  } = params;
  if (mob.state !== "wander" || mob.route.length > 0) return;
  mob.object.getWorldPosition(positionScratch);
  const nextWaypoint = waypoints
    .filter(
      (waypoint) =>
        getMatryoshkaHorizontalDistanceSquared(waypoint, positionScratch) >
          36 &&
        isDestinationAvailable(mob, waypoint) &&
        !isWallPathBlocked(positionScratch, waypoint),
    )
    .sort(
      (first, second) =>
        first.distanceToSquared(positionScratch) -
        second.distanceToSquared(positionScratch),
    )[0];
  if (!nextWaypoint) return;
  mob.route = [nextWaypoint.clone()];
  mob.target.copy(nextWaypoint);
  mob.patrolDestination = nextWaypoint.clone();
}
