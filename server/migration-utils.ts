import { PointsConfig } from '../shared/schema';
import type { Tournament } from '../shared/schema';

/**
 * Get points for a given position from a points table (array of {position, points})
 * @param position Player's finishing position
 * @param pointsTable Array of { position, points }
 * @returns Points for the given position, or 0 if not found
 */
export function getPointsFromConfig(
  position: number,
  pointsTable: { position: number; points: number }[],
): number {
  if (!Array.isArray(pointsTable)) return 0;
  const entry = pointsTable.find((p) => p.position === position);
  return entry ? entry.points : 0;
}

/**
 * Utility to log summary of points config for debugging
 */
export function logPointsConfig(pointsConfig: PointsConfig) {
  console.log(
    'Tour points 1st-5th:',
    pointsConfig.tour.slice(0, 5).map((p) => `${p.position}=${p.points}`),
  );
  console.log(
    'Major points 1st-5th:',
    pointsConfig.major.slice(0, 5).map((p) => `${p.position}=${p.points}`),
  );
}

/**
 * Calculate average points for tied positions (migration-safe, backend only)
 * @param startPosition Starting position of the tie (1-based)
 * @param numTiedPlayers Number of players tied
 * @param pointsTable Array of { position, points }
 * @returns Average points for tied players (rounded to 1 decimal)
 */
export function calculateTiePointsFromTable(
  startPosition: number,
  numTiedPlayers: number,
  pointsTable: { position: number; points: number }[],
): number {
  let totalPoints = 0;
  for (let i = 0; i < numTiedPlayers; i++) {
    totalPoints += getPointsFromConfig(startPosition + i, pointsTable);
  }
  return Math.round((totalPoints / numTiedPlayers) * 10) / 10;
}

/**
 * Calculate average points for tied positions using tournament type and PointsConfig
 * @param startPosition Starting position of the tie (1-based)
 * @param numTiedPlayers Number of players tied
 * @param tournamentType Tournament type (e.g. 'major', 'tour', 'league', 'supr')
 * @param pointsConfig PointsConfig object from DB
 * @returns Average points for tied players (rounded to 1 decimal)
 */
export function calculateTiePointsFromConfig(
  startPosition: number,
  numTiedPlayers: number,
  tournamentType: keyof PointsConfig,
  pointsConfig: PointsConfig,
): number {
  const table = pointsConfig[tournamentType];
  return calculateTiePointsFromTable(startPosition, numTiedPlayers, table);
}

/**
 * Utility to group results by score for tie handling (migration-safe, backend only)
 * @param results Array of results with a score field
 * @param scoreField 'grossScore' | 'netScore'
 * @returns Array of tie groups, each with score and array of results
 */
export function groupResultsByScore<T extends { [key: string]: any }>(
  results: T[],
  scoreField: 'grossScore' | 'netScore',
): Array<{ score: number; players: T[] }> {
  const groups = new Map<number, T[]>();
  for (const result of results) {
    const score = result[scoreField];
    if (score === null || score === undefined) continue;
    if (!groups.has(score)) groups.set(score, []);
    groups.get(score)!.push(result);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([score, players]) => ({ score, players }));
}

/**
 * Utility to assign positions to sorted results with tie handling (migration-safe, backend only)
 * @param sortedResults Array of results sorted by score (ascending)
 * @param scoreField 'grossScore' | 'netScore'
 * @returns Array of { id, playerId, position }
 */
export function assignPositionsWithTies<
  T extends { id: number; playerId: number; [key: string]: any },
>(
  sortedResults: T[],
  scoreField: 'grossScore' | 'netScore',
): Array<{ id: number; playerId: number; position: number }> {
  const positions: Array<{ id: number; playerId: number; position: number }> = [];
  let currentPosition = 1;
  for (let i = 0; i < sortedResults.length; i++) {
    const currentScore = sortedResults[i][scoreField];
    if (i > 0 && currentScore === sortedResults[i - 1][scoreField]) {
      // Tie - use same position as previous
      positions.push({
        id: sortedResults[i].id,
        playerId: sortedResults[i].playerId,
        position: positions[positions.length - 1].position,
      });
    } else {
      // New position (skip positions if there were ties)
      currentPosition = i + 1;
      positions.push({
        id: sortedResults[i].id,
        playerId: sortedResults[i].playerId,
        position: currentPosition,
      });
    }
  }
  return positions;
}

/**
 * Check if a tournament should be excluded from migration/recalculation
 * @param tournament Tournament object
 * @returns true if tournament should be skipped
 */
export function shouldSkipTournament(
  tournament: Pick<Tournament, 'isManualEntry' | 'name'>,
): boolean {
  if (tournament.isManualEntry) {
    console.log(`   ⏭️  Skipping manual entry tournament: ${tournament.name}`);
    return true;
  }
  return false;
}
