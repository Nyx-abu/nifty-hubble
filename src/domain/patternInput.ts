export interface GridPoint {
  x: number;
  y: number;
}

const dotPoint = (dot: number): GridPoint => ({ x: 50 + (dot % 3) * 100, y: 50 + Math.floor(dot / 3) * 100 });

/** Find every dot touched by a swept pointer segment, in the order the pointer crosses them. */
export function dotsOnSegment(from: GridPoint, to: GridPoint, radius = 30): number[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const intersections: { dot: number; t: number; distance: number }[] = [];
  for (let dot = 0; dot < 9; dot += 1) {
    const point = dotPoint(dot);
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
    const distance = Math.hypot(point.x - (from.x + t * dx), point.y - (from.y + t * dy));
    if (distance <= radius) intersections.push({ dot, t, distance });
  }
  intersections.sort((left, right) => left.t - right.t || left.distance - right.distance);
  return intersections.map(({ dot }) => dot);
}
