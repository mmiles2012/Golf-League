import { TournamentType, PointsConfig } from '@shared/schema';

/**
 * Shared points and tie calculation utilities for backend (server)
 * Used by leaderboard, tie handler, and migration scripts
 */

/**
 * Calculate points based on position and tournament type
 * @param position - Finishing position (1-based)
 * @param tournamentType - Type of tournament ('major', 'tour', 'league', or 'supr')
 * @param pointsConfig - Optional points config from DB (array of {position, points})
 * @returns Points awarded for the position
 */
export function calculatePoints(
  position: number,
  tournamentType: TournamentType,
  pointsConfig?: { position: number; points: number }[],
): number {
  if (position <= 0) return 0;
  if (pointsConfig && Array.isArray(pointsConfig)) {
    const entry = pointsConfig.find((p) => p.position === position);
    return entry ? entry.points : 0;
  }
  // Fallback logic (legacy)
  let points = 0;
  if (tournamentType === 'major') {
    if (position === 1) points = 1000;
    else if (position === 2) points = 800;
    else if (position === 3) points = 650;
    else if (position === 4) points = 520;
    else if (position === 5) points = 400;
    else if (position >= 6 && position <= 10) points = 300 - (position - 6) * 50;
    else if (position >= 11 && position <= 20) points = 95 - (position - 11) * 5;
    else points = 0;
  } else if (tournamentType === 'tour') {
    if (position === 1) points = 500;
    else if (position === 2) points = 400;
    else if (position === 3) points = 325;
    else if (position === 4) points = 260;
    else if (position === 5) points = 200;
    else if (position >= 6 && position <= 10) points = 150 - (position - 6) * 25;
    else if (position >= 11 && position <= 20) points = 48 - (position - 11) * 2.5;
    else points = 0;
  } else if (tournamentType === 'league') {
    if (position === 1) points = 250;
    else if (position === 2) points = 200;
    else if (position === 3) points = 160;
    else if (position === 4) points = 130;
    else if (position === 5) points = 100;
    else if (position >= 6 && position <= 10) points = 75 - (position - 6) * 12.5;
    else if (position >= 11 && position <= 20) points = 24 - (position - 11) * 1.25;
    else points = 0;
  } else if (tournamentType === 'supr') {
    if (position === 1) points = 125;
    else if (position === 2) points = 100;
    else if (position === 3) points = 80;
    else if (position === 4) points = 65;
    else if (position === 5) points = 50;
    else if (position >= 6 && position <= 10) points = 38 - (position - 6) * 6.25;
    else if (position >= 11 && position <= 20) points = 12 - (position - 11) * 0.625;
    else points = 0;
  }
  return points;
}

/**
 * Calculate average points for tied positions
 * @param startPosition - Starting position of the tie
 * @param numTiedPlayers - Number of players tied
 * @param tournamentType - Tournament type
 * @param pointsConfig - Optional points config from DB
 * @returns Average points for tied players
 */
export function calculateTiePoints(
  startPosition: number,
  numTiedPlayers: number,
  tournamentType: TournamentType,
  pointsConfig?: { position: number; points: number }[],
): number {
  let totalPoints = 0;
  for (let i = 0; i < numTiedPlayers; i++) {
    const pos = startPosition + i;
    totalPoints += calculatePoints(pos, tournamentType, pointsConfig);
  }
  return Math.round((totalPoints / numTiedPlayers) * 10) / 10;
}

/**
 * Format position display for ties (e.g., T2)
 */
export function formatPosition(position: number, isTied: boolean): string {
  return isTied ? `T${position}` : `${position}`;
}
