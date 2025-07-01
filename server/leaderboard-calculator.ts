import { db } from "./db";
import { tournaments, players, playerResults } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import type { 
  Player, 
  Tournament, 
  PlayerResult, 
  PlayerWithHistory,
  PointsConfig 
} from "@shared/schema";

export class LeaderboardCalculator {
  private pointsConfig: PointsConfig;

  constructor(pointsConfig: PointsConfig) {
    this.pointsConfig = pointsConfig;
  }

  /**
   * Calculate player history for either net or gross scoring
   */
  async calculatePlayerHistory(playerId: number, scoreType: 'net' | 'gross'): Promise<PlayerWithHistory | undefined> {
    const player = await this.getPlayer(playerId);
    if (!player) return undefined;

    const results = await this.getPlayerResults(playerId);
    if (!results.length) return undefined;

    // Get tournaments for these results
    const tournamentIds = results.map(r => r.tournamentId);
    const tournamentList = await db.select()
      .from(tournaments)
      .where(inArray(tournaments.id, tournamentIds));
    
    const tournamentMap = new Map<number, Tournament>();
    tournamentList.forEach((t: Tournament) => tournamentMap.set(t.id, t));

    const tournamentDetails = [];
    let totalPoints = 0;
    let majorPoints = 0;
    let tourPoints = 0;
    let leaguePoints = 0;
    let suprPoints = 0;

    // Track scores for averaging
    let totalNetScores = 0;
    let totalGrossScores = 0;
    let scoreCount = 0;

    for (const result of results) {
      const tournament = tournamentMap.get(result.tournamentId);
      if (!tournament) continue;

      // For StrokeNet scoring:
      // Net Score = result.netScore (this is the "total" from the file)
      // Gross Score = Net Score + Course Handicap
      const netScore = result.netScore;
      const grossScore = result.netScore !== null && result.handicap !== null ? result.netScore + result.handicap : null;

      if (netScore !== null) {
        totalNetScores += netScore;
        if (grossScore !== null) {
          totalGrossScores += grossScore;
        }
        scoreCount++;
      }

      // Use appropriate points based on score type
      const pointsToUse = scoreType === 'gross' ? (result.grossPoints || 0) : (result.points || 0);

      const tournamentDetail = {
        id: result.id,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        tournamentDate: tournament.date,
        tournamentType: tournament.type,
        position: result.position,
        grossPosition: result.position, // For now, use same position - this could be calculated separately
        netScore: netScore,
        grossScore: grossScore,
        handicap: result.handicap,
        points: pointsToUse,
        grossPoints: result.grossPoints || 0,
        netPoints: result.points || 0
      };

      tournamentDetails.push(tournamentDetail);
      totalPoints += pointsToUse;

      // Add points to category totals
      switch (tournament.type) {
        case 'major':
          majorPoints += pointsToUse;
          break;
        case 'tour':
          tourPoints += pointsToUse;
          break;
        case 'league':
          leaguePoints += pointsToUse;
          break;
        case 'supr':
          suprPoints += pointsToUse;
          break;
      }
    }

    const averageNetScore = scoreCount > 0 ? totalNetScores / scoreCount : 0;
    const averageGrossScore = scoreCount > 0 ? totalGrossScores / scoreCount : 0;

    const result = {
      player: {
        id: player.id,
        name: player.name,
        email: player.email,
        defaultHandicap: player.defaultHandicap
      },
      tournaments: tournamentDetails,
      totalPoints,
      majorPoints,
      tourPoints,
      leaguePoints,
      suprPoints,
      totalEvents: tournamentDetails.length,
      rank: 0, // Will be set in leaderboard sorting
      averageNetScore,
      averageGrossScore,
      averageScore: scoreType === 'net' ? averageNetScore : averageGrossScore
    };

    // Calculate top 8 events points
    const top8Results = this.calculateTop8Points(tournamentDetails, scoreType);

    // Add type-specific fields when in gross mode
    if (scoreType === 'gross') {
      return {
        ...result,
        grossTotalPoints: totalPoints,
        grossTourPoints: tourPoints,
        grossTop8TotalPoints: top8Results.totalPoints,
        grossTop8TourPoints: top8Results.tourPoints,
        grossTop8MajorPoints: top8Results.majorPoints
      };
    }

    // Add top 8 fields for net mode
    return {
      ...result,
      top8TotalPoints: top8Results.totalPoints,
      top8TourPoints: top8Results.tourPoints,
      top8MajorPoints: top8Results.majorPoints
    };
  }

  /**
   * Generate net leaderboard with proper sorting
   */
  async generateNetLeaderboard(): Promise<PlayerWithHistory[]> {
    const allPlayers = await this.getAllPlayers();
    const leaderboard: PlayerWithHistory[] = [];
    
    for (const player of allPlayers) {
      const playerHistory = await this.calculatePlayerHistory(player.id, 'net');
      if (playerHistory && (playerHistory.top8TotalPoints || 0) > 0) {
        leaderboard.push(playerHistory);
      }
    }
    
    // Sort by top 8 points (descending), then by player handicap (ascending - lower handicap wins ties)
    leaderboard.sort((a, b) => {
      const top8PointsA = a.top8TotalPoints || 0;
      const top8PointsB = b.top8TotalPoints || 0;
      
      if (top8PointsB !== top8PointsA) {
        return top8PointsB - top8PointsA;
      }
      // Use player default handicap for tie-breaking (lower handicap wins)
      const handicapA = a.player.defaultHandicap || 999;
      const handicapB = b.player.defaultHandicap || 999;
      return handicapA - handicapB;
    });
    
    // Assign ranks
    leaderboard.forEach((player, index) => {
      player.rank = index + 1;
    });
    
    return leaderboard;
  }

  /**
   * Generate gross leaderboard with proper sorting
   */
  async generateGrossLeaderboard(): Promise<PlayerWithHistory[]> {
    const allPlayers = await this.getAllPlayers();
    const leaderboard: PlayerWithHistory[] = [];
    
    for (const player of allPlayers) {
      const playerHistory = await this.calculatePlayerHistory(player.id, 'gross');
      if (playerHistory && (playerHistory.grossTop8TotalPoints || 0) > 0) {
        leaderboard.push(playerHistory);
      }
    }
    
    // Sort by gross top 8 points (descending), then by player handicap (ascending - lower handicap wins ties)
    leaderboard.sort((a, b) => {
      const grossTop8PointsA = a.grossTop8TotalPoints || 0;
      const grossTop8PointsB = b.grossTop8TotalPoints || 0;
      
      if (grossTop8PointsB !== grossTop8PointsA) {
        return grossTop8PointsB - grossTop8PointsA;
      }
      // Use player default handicap for tie-breaking (lower handicap wins)
      const handicapA = a.player.defaultHandicap || 999;
      const handicapB = b.player.defaultHandicap || 999;
      return handicapA - handicapB;
    });
    
    // Assign ranks
    leaderboard.forEach((player, index) => {
      player.rank = index + 1;
    });
    
    return leaderboard;
  }

  /**
   * Calculate top 8 events points from tournament details
   */
  private calculateTop8Points(tournamentDetails: any[], scoreType: 'net' | 'gross'): {
    totalPoints: number;
    majorPoints: number;
    tourPoints: number;
  } {
    // Sort tournaments by points (descending) to get the highest scoring events
    const pointsField = scoreType === 'gross' ? 'grossPoints' : 'points';
    const sortedTournaments = [...tournamentDetails]
      .filter(t => t[pointsField] > 0) // Only include events with points
      .sort((a, b) => b[pointsField] - a[pointsField]);

    // Take top 8 events
    const top8Events = sortedTournaments.slice(0, 8);

    // Calculate totals from top 8 events
    let totalPoints = 0;
    let majorPoints = 0;
    let tourPoints = 0;

    for (const tournament of top8Events) {
      const points = tournament[pointsField];
      totalPoints += points;

      switch (tournament.tournamentType) {
        case 'major':
          majorPoints += points;
          break;
        case 'tour':
          tourPoints += points;
          break;
        // Note: league and supr points are included in totalPoints but not tracked separately for top 8
      }
    }

    return {
      totalPoints,
      majorPoints,
      tourPoints
    };
  }

  /**
   * Calculate points for a given position and tournament type
   */
  calculatePointsForPosition(position: number, tournamentType: string): number {
    if (!this.pointsConfig[tournamentType as keyof PointsConfig]) {
      return 0;
    }

    const typeConfig = this.pointsConfig[tournamentType as keyof PointsConfig];
    const positionConfig = typeConfig.find(p => p.position === position);
    
    if (positionConfig) {
      return positionConfig.points;
    } else if (typeConfig.length > 0) {
      // If we don't have points for this specific position, use the last defined position
      const lastPosition = typeConfig.slice(-1)[0];
      return lastPosition ? lastPosition.points : 0;
    }
    
    return 0;
  }

  // Helper methods for database access
  private async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  private async getAllPlayers(): Promise<Player[]> {
    return db.select().from(players).orderBy(players.name);
  }

  private async getPlayerResults(playerId: number): Promise<PlayerResult[]> {
    return db.select()
      .from(playerResults)
      .where(eq(playerResults.playerId, playerId));
  }
}