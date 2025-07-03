import { PointsConfig } from "../shared/schema";

/**
 * Get points for a given position from a points table (array of {position, points})
 * @param position Player's finishing position
 * @param pointsTable Array of { position, points }
 * @returns Points for the given position, or 0 if not found
 */
export function getPointsFromConfig(position: number, pointsTable: { position: number; points: number }[]): number {
  if (!Array.isArray(pointsTable)) return 0;
  const entry = pointsTable.find(p => p.position === position);
  return entry ? entry.points : 0;
}

/**
 * Utility to log summary of points config for debugging
 */
export function logPointsConfig(pointsConfig: PointsConfig) {
  console.log('Tour points 1st-5th:', pointsConfig.tour.slice(0, 5).map(p => `${p.position}=${p.points}`));
  console.log('Major points 1st-5th:', pointsConfig.major.slice(0, 5).map(p => `${p.position}=${p.points}`));
}
