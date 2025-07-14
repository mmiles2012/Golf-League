import { PointsConfig } from "../shared/schema";

/**
 * Calculate gross points for a given position and tournament type using DB config
 * @param position Player's gross finishing position
 * @param tournamentType 'major' | 'tour'
 * @param pointsConfig PointsConfig object from DB
 * @returns Points for the given position and tournament type
 */
export function calculateGrossPoints(position: number, tournamentType: string, pointsConfig: PointsConfig): number {
  if (!['major', 'tour'].includes(tournamentType)) return 0;
  const table = pointsConfig[tournamentType as keyof PointsConfig];
  if (!Array.isArray(table)) return 0;
  const entry = table.find(p => p.position === position);
  return entry ? entry.points : 0;
}
