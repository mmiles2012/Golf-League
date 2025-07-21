import type { TournamentType } from '@shared/schema';

// Define point arrays based on position for each tournament type
const MAJOR_POINTS = [
  750,
  400,
  350,
  325,
  300,
  275,
  225,
  200,
  175,
  150, // 1-10
  130,
  120,
  110,
  90,
  80,
  70,
  65,
  60,
  55,
  50, // 11-20
  48,
  46,
  44,
  42,
  40,
  38,
  36,
  34,
  32.5,
  31, // 21-30
  29.5,
  28,
  26.5,
  25,
  24,
  23,
  22,
  21,
  20.25,
  19.5, // 31-40
  18.75,
  18,
  17.25,
  16.5,
  15.75,
  15,
  14.25,
  13.5,
  13,
  12.5, // 41-50
  12,
  11.5,
  11,
  10.5,
  10,
  9.5,
  9,
  8.5,
  8,
  7.75, // 51-60
  7.5,
  7.25,
  7, // 61-63
];

// Points distribution from the PDF for Tour events
const TOUR_POINTS = [
  500,
  300,
  190,
  135,
  110,
  100,
  90,
  85,
  80,
  75, // 1-10
  70,
  65,
  60,
  55,
  53,
  51,
  49,
  47,
  45,
  43, // 11-20
  41,
  39,
  37,
  35.5,
  34,
  32.5,
  31,
  29.5,
  28,
  26.5, // 21-30
  25,
  23.5,
  22,
  21,
  20,
  19,
  18,
  17,
  16,
  15, // 31-40
  14,
  13,
  12,
  11,
  10.5,
  10,
  9.5,
  9,
  8.5,
  8, // 41-50
  7.5,
  7,
  6.5,
  6,
  5.8,
  5.6,
  5.4,
  5.2,
  5,
  4.8, // 51-60
  4.6,
  4.4,
  4.2,
  4,
  3.8, // 61-65
];

const LEAGUE_SUPR_POINTS = [
  93.75,
  50,
  43.75,
  40.625,
  37.5,
  34.375,
  28.125,
  25,
  21.875,
  18.75, // 1-10
  16.25,
  15,
  13.75,
  11.25,
  10,
  8.75,
  8.125,
  7.5,
  6.875,
  6, // 11-20
];

/**
 * Calculate points based on position and tournament type
 * @param position - Finishing position (1-based)
 * @param tournamentType - Type of tournament ('major', 'tour', 'league', or 'supr')
 * @returns Points awarded for the position
 */
export function calculatePoints(position: number, tournamentType: TournamentType): number {
  // Position must be positive
  if (position < 1) {
    return 0;
  }

  // Adjust position to 0-based index for arrays
  const index = position - 1;

  // Return points based on tournament type and position
  switch (tournamentType) {
    case 'major':
      return index < MAJOR_POINTS.length ? MAJOR_POINTS[index] : 0;

    case 'tour':
      return index < TOUR_POINTS.length ? TOUR_POINTS[index] : 0;

    case 'league':
    case 'supr':
      return index < LEAGUE_SUPR_POINTS.length ? LEAGUE_SUPR_POINTS[index] : 0;

    default:
      return 0;
  }
}

/**
 * Calculate gross score from net score and handicap
 * @param netScore - Net score
 * @param handicap - Player handicap (can be negative for players better than scratch)
 * @returns Gross score (for negative handicaps, gross will be lower than net)
 * @example
 * // Regular player: Net 80, Handicap 10 → Gross 90
 * calculateGrossScore(80, 10) // returns 90
 *
 * // Scratch+ player: Net 72, Handicap -2 → Gross 70
 * calculateGrossScore(72, -2) // returns 70
 */
export function calculateGrossScore(netScore: number, handicap: number): number {
  return netScore + handicap;
}

/**
 * Calculate net score from gross score and handicap
 * @param grossScore - Gross score
 * @param handicap - Player handicap
 * @returns Net score
 */
export function calculateNetScore(grossScore: number, handicap: number): number {
  return grossScore - handicap;
}

/**
 * Calculate points for tied positions
 * Points are averaged across all tied positions
 * @param startPosition - Starting position of the tie
 * @param numTiedPlayers - Number of players tied
 * @param tournamentType - Type of tournament
 * @returns Average points for tied players
 */
export function calculateTiePoints(
  startPosition: number,
  numTiedPlayers: number,
  tournamentType: TournamentType,
): number {
  let totalPoints = 0;

  // Sum points for all tied positions
  for (let i = 0; i < numTiedPlayers; i++) {
    const position = startPosition + i;
    totalPoints += calculatePoints(position, tournamentType);
  }

  // Return average points (rounded to 1 decimal place)
  return Math.round((totalPoints / numTiedPlayers) * 10) / 10;
}

/**
 * Format position display for ties
 * @param position - Actual position
 * @param isTied - Whether this position is tied
 * @returns Formatted position string (e.g., "T2" for tied 2nd)
 */
export function formatPosition(position: number, isTied: boolean): string {
  return isTied ? `T${position}` : `${position}`;
}

/**
 * Check if a group of results contains ties based on scores
 * @param results - Array of results with scores
 * @param scoreType - Whether to check 'net' or 'gross' scores
 * @returns True if ties are detected
 */
export function detectTies(
  results: Array<{ netScore?: number | null; grossScore?: number | null }>,
  scoreType: 'net' | 'gross' = 'net',
): boolean {
  const scores = results
    .map((r) => (scoreType === 'net' ? r.netScore : r.grossScore))
    .filter((score) => score !== null && score !== undefined);

  const uniqueScores = new Set(scores);
  return scores.length !== uniqueScores.size;
}
