import { PointsConfig } from "../shared/schema";

export interface TieGroup {
  position: number;
  players: Array<{
    playerId: number;
    playerName: string;
    score: number;
    handicap: number | null;
  }>;
  pointsPerPlayer: number;
}

export interface ProcessedResult {
  playerId: number;
  playerName: string;
  position: number;
  tiedPosition: boolean;
  displayPosition: string; // e.g., "T2" for tied 2nd
  grossScore: number | null;
  netScore: number | null;
  handicap: number | null;
  points: number;
}

export class TieHandler {
  private pointsConfig: PointsConfig;

  constructor(pointsConfig: PointsConfig) {
    this.pointsConfig = pointsConfig;
  }

  /**
   * Process a list of results to handle ties properly
   * @param results - Array of player results with scores
   * @param tournamentType - Type of tournament for points calculation
   * @param scoreType - Whether to use 'net' or 'gross' scores for tie detection
   * @returns Processed results with proper tie handling
   */
  processResultsWithTies(
    results: Array<{
      playerId: number;
      playerName: string;
      grossScore: number | null;
      netScore: number | null;
      handicap: number | null;
    }>,
    tournamentType: string,
    scoreType: 'net' | 'gross' = 'net'
  ): ProcessedResult[] {
    // Filter out players without scores
    const validResults = results.filter(r => {
      const score = scoreType === 'net' ? r.netScore : r.grossScore;
      return score !== null && score !== undefined;
    });

    // Sort by score (ascending for golf - lower is better)
    validResults.sort((a, b) => {
      const scoreA = scoreType === 'net' ? a.netScore! : a.grossScore!;
      const scoreB = scoreType === 'net' ? b.netScore! : b.grossScore!;
      return scoreA - scoreB;
    });

    // Group players by score to identify ties
    const tieGroups = this.groupPlayersByScore(validResults, scoreType);

    // Calculate positions and points for each tie group
    const processedResults: ProcessedResult[] = [];
    let currentPosition = 1;

    for (const tieGroup of tieGroups) {
      const numPlayersInTie = tieGroup.players.length;
      
      // Calculate points for this tie group
      const pointsPerPlayer = this.calculateTiePoints(
        currentPosition,
        numPlayersInTie,
        tournamentType
      );

      // Add each player in the tie group
      for (const player of tieGroup.players) {
        const displayPosition = numPlayersInTie > 1 ? `T${currentPosition}` : `${currentPosition}`;
        
        processedResults.push({
          playerId: player.playerId,
          playerName: player.playerName,
          position: currentPosition,
          tiedPosition: numPlayersInTie > 1,
          displayPosition,
          grossScore: results.find(r => r.playerId === player.playerId)?.grossScore || null,
          netScore: results.find(r => r.playerId === player.playerId)?.netScore || null,
          handicap: player.handicap,
          points: pointsPerPlayer
        });
      }

      // Skip positions for tied players
      // e.g., if 3 players tie for 2nd, next player gets 5th place
      currentPosition += numPlayersInTie;
    }

    return processedResults;
  }

  /**
   * Group players by their scores to identify ties
   */
  private groupPlayersByScore(
    results: Array<{
      playerId: number;
      playerName: string;
      grossScore: number | null;
      netScore: number | null;
      handicap: number | null;
    }>,
    scoreType: 'net' | 'gross'
  ): TieGroup[] {
    const scoreGroups = new Map<number, TieGroup['players']>();

    for (const result of results) {
      const score = scoreType === 'net' ? result.netScore! : result.grossScore!;
      
      if (!scoreGroups.has(score)) {
        scoreGroups.set(score, []);
      }

      scoreGroups.get(score)!.push({
        playerId: result.playerId,
        playerName: result.playerName,
        score,
        handicap: result.handicap
      });
    }

    // Convert to TieGroup array, maintaining sort order
    const tieGroups: TieGroup[] = [];
    let position = 1;

    // Get sorted scores and iterate
    const sortedScores = Array.from(scoreGroups.keys()).sort((a, b) => a - b);
    
    for (const score of sortedScores) {
      const players = scoreGroups.get(score)!;
      tieGroups.push({
        position,
        players,
        pointsPerPlayer: 0 // Will be calculated later
      });
      position += players.length;
    }

    return tieGroups;
  }

  /**
   * Calculate points for tied players
   * Points are averaged across all tied positions
   */
  private calculateTiePoints(
    startPosition: number,
    numTiedPlayers: number,
    tournamentType: string
  ): number {
    let totalPoints = 0;

    // Sum points for all tied positions
    for (let i = 0; i < numTiedPlayers; i++) {
      const position = startPosition + i;
      totalPoints += this.getPointsForPosition(position, tournamentType);
    }

    // Return average points (rounded to 1 decimal place)
    return Math.round((totalPoints / numTiedPlayers) * 10) / 10;
  }

  /**
   * Get points for a specific position and tournament type
   */
  public getPointsForPosition(position: number, tournamentType: string): number {
    const config = this.pointsConfig[tournamentType as keyof PointsConfig];
    if (!config || !Array.isArray(config)) return 0;

    // Find the position in the config array
    const positionConfig = config.find(p => p.position === position);
    
    if (positionConfig) {
      return positionConfig.points;
    }

    // If exact position not found, try to find the last available position
    const lastPosition = config[config.length - 1];
    return position > lastPosition.position ? 0 : lastPosition.points;
  }

  /**
   * Detect if uploaded data already has tie positions (e.g., multiple players with same position)
   */
  static detectExistingTies(results: Array<{ position: number }>): boolean {
    const positions = results.map(r => r.position);
    const uniquePositions = new Set(positions);
    return positions.length !== uniquePositions.size;
  }

  /**
   * Validate that positions make sense (no gaps unless there are ties)
   */
  static validatePositions(results: Array<{ position: number; score: number }>): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Sort by position
    const sortedResults = [...results].sort((a, b) => a.position - b.position);
    
    let expectedPosition = 1;
    let previousScore: number | null = null;
    
    for (let i = 0; i < sortedResults.length; i++) {
      const result = sortedResults[i];
      
      // Check if position sequence makes sense
      if (result.position < expectedPosition) {
        issues.push(`Position ${result.position} appears after position ${expectedPosition - 1}`);
      }
      
      // Check if tied players have same position
      if (previousScore !== null && result.score === previousScore && result.position !== sortedResults[i - 1].position) {
        issues.push(`Players with same score (${result.score}) should have same position`);
      }
      
      // Check if different scores have different positions when not tied
      if (previousScore !== null && result.score !== previousScore && result.position === sortedResults[i - 1].position) {
        issues.push(`Players with different scores should not have same position`);
      }
      
      previousScore = result.score;
      expectedPosition = result.position + 1;
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}