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

    return {
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
  }

  /**
   * Generate net leaderboard with proper sorting
   */
  async generateNetLeaderboard(): Promise<PlayerWithHistory[]> {
    const allPlayers = await this.getAllPlayers();
    const leaderboard: PlayerWithHistory[] = [];
    
    for (const player of allPlayers) {
      const playerHistory = await this.calculatePlayerHistory(player.id, 'net');
      if (playerHistory && playerHistory.totalPoints > 0) {
        leaderboard.push(playerHistory);
      }
    }
    
    // Sort by total points (descending), then by average net score (ascending - lower is better)
    leaderboard.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return (a.averageNetScore || 999) - (b.averageNetScore || 999);
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
      if (playerHistory && playerHistory.totalPoints > 0) {
        leaderboard.push(playerHistory);
      }
    }
    
    // Sort by total points (descending), then by average gross score (ascending - lower is better)
    leaderboard.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return (a.averageGrossScore || 999) - (b.averageGrossScore || 999);
    });
    
    // Assign ranks
    leaderboard.forEach((player, index) => {
      player.rank = index + 1;
    });
    
    return leaderboard;
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