import * as THREE from "three";

export function findNearestWaypoint(
  position: THREE.Vector3,
  waypoints: THREE.Vector3[],
  isPathClear: (start: THREE.Vector3, end: THREE.Vector3) => boolean,
): THREE.Vector3 | null {
  let nearest: THREE.Vector3 | null = null;
  let nearestDistance = Infinity;
  for (const waypoint of waypoints) {
    const distance = waypoint.distanceToSquared(position);
    if (distance < nearestDistance && isPathClear(position, waypoint)) {
      nearest = waypoint;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function findRoute(
  start: THREE.Vector3,
  end: THREE.Vector3,
  waypoints: THREE.Vector3[],
  isPathClear: (start: THREE.Vector3, end: THREE.Vector3) => boolean,
): THREE.Vector3[] {
  const startWaypoint = findNearestWaypoint(start, waypoints, isPathClear);
  const endWaypoint = findNearestWaypoint(end, waypoints, isPathClear);
  if (!startWaypoint || !endWaypoint) return [];
  if (Math.abs(end.y - start.y) <= 2.5 && isPathClear(start, end))
    return [end.clone()];

  const distances = new Map<THREE.Vector3, number>(
    waypoints.map((waypoint) => [waypoint, Infinity]),
  );
  const previous = new Map<THREE.Vector3, THREE.Vector3>();
  const open = [startWaypoint];
  distances.set(startWaypoint, 0);
  while (open.length > 0) {
    open.sort(
      (first, second) =>
        (distances.get(first) ?? Infinity) -
        (distances.get(second) ?? Infinity),
    );
    const current = open.shift()!;
    if (current === endWaypoint) break;
    for (const neighbor of waypoints) {
      if (
        neighbor === current ||
        current.distanceToSquared(neighbor) > 36 ||
        Math.abs(neighbor.y - current.y) > 2.5 ||
        !isPathClear(current, neighbor)
      )
        continue;
      const nextDistance =
        (distances.get(current) ?? Infinity) + current.distanceTo(neighbor);
      if (nextDistance >= (distances.get(neighbor) ?? Infinity)) continue;
      distances.set(neighbor, nextDistance);
      previous.set(neighbor, current);
      if (!open.includes(neighbor)) open.push(neighbor);
    }
  }
  if (!previous.has(endWaypoint) && endWaypoint !== startWaypoint) return [];
  const route: THREE.Vector3[] = [end.clone()];
  let current: THREE.Vector3 | undefined = endWaypoint;
  while (current && current !== startWaypoint) {
    route.unshift(current.clone());
    current = previous.get(current);
  }
  return route;
}

export function getRouteDistance(
  start: THREE.Vector3,
  route: THREE.Vector3[],
): number {
  return route.reduce(
    (distance, point, index) =>
      distance +
      (index === 0
        ? start.distanceTo(point)
        : route[index - 1].distanceTo(point)),
    0,
  );
}
