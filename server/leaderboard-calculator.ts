import { db } from "./db";
import { tournaments, players, playerResults, users, playerProfiles } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import type { 
  Player, 
  Tournament, 
  PlayerResult, 
  PlayerWithHistory,
  PointsConfig 
} from "@shared/schema";
import { setTimeout as setTimeoutPromise } from 'timers/promises';
import { calculatePoints } from "./points-utils";

/**
 * Enum for supported tournament types
 */
enum TournamentType {
  Major = 'major',
  Tour = 'tour',
  League = 'league',
  Supr = 'supr'
}

// Simple in-memory cache for leaderboard results
const leaderboardCache: {
  net?: { data: PlayerWithHistory[]; expires: number };
  gross?: { data: PlayerWithHistory[]; expires: number };
} = {};
const LEADERBOARD_CACHE_TTL_MS = 5* 60 * 1000; // 5 minutes

export class LeaderboardCalculator {
  private pointsConfig: PointsConfig;

  constructor(pointsConfig: PointsConfig) {
    this.pointsConfig = pointsConfig;
  }

  /**
   * Calculate player history for either net or gross scoring
   * @param playerId Player ID
   * @param scoreType 'net' or 'gross'
   * @returns PlayerWithHistory or undefined if no results
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
        grossPosition: result.grossPosition || result.position, // Use actual gross position from database
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
        defaultHandicap: player.defaultHandicap,
        homeClub: (player as any).homeClub
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
   * Generate net leaderboard with proper sorting (batch DB, with cache)
   * @returns Array of PlayerWithHistory sorted by top 8 net points
   */
  async generateNetLeaderboard(): Promise<PlayerWithHistory[]> {
    const now = Date.now();
    if (leaderboardCache.net && leaderboardCache.net.expires > now) {
      return leaderboardCache.net.data;
    }
    // Batch fetch all players, results, and tournaments
    const [allPlayers, allResults, allTournaments] = await Promise.all([
      this.getAllPlayers(),
      this.getAllPlayerResults(),
      this.getAllTournaments()
    ]);
    const tournamentMap = new Map<number, Tournament>();
    allTournaments.forEach((t: Tournament) => tournamentMap.set(t.id, t));
    // Group results by playerId
    const resultsByPlayer = new Map<number, PlayerResult[]>();
    for (const result of allResults) {
      if (!resultsByPlayer.has(result.playerId)) resultsByPlayer.set(result.playerId, []);
      resultsByPlayer.get(result.playerId)!.push(result);
    }
    const leaderboard: PlayerWithHistory[] = [];
    for (const player of allPlayers) {
      const results = resultsByPlayer.get(player.id) || [];
      if (!results.length) continue;
      const playerHistory = await this.calculatePlayerHistoryBatch(player, results, tournamentMap, 'net');
      if (playerHistory && (playerHistory.top8TotalPoints || 0) > 0) {
        leaderboard.push(playerHistory);
      }
    }
    leaderboard.sort((a, b) => {
      const top8PointsA = a.top8TotalPoints || 0;
      const top8PointsB = b.top8TotalPoints || 0;
      if (top8PointsB !== top8PointsA) return top8PointsB - top8PointsA;
      const handicapA = a.player.defaultHandicap || 999;
      const handicapB = b.player.defaultHandicap || 999;
      return handicapA - handicapB;
    });
    leaderboard.forEach((player, index) => { player.rank = index + 1; });
    leaderboardCache.net = { data: leaderboard, expires: Date.now() + LEADERBOARD_CACHE_TTL_MS };
    return leaderboard;
  }

  /**
   * Generate gross leaderboard with proper sorting (batch DB, with cache)
   * @returns Array of PlayerWithHistory sorted by top 8 gross points
   */
  async generateGrossLeaderboard(): Promise<PlayerWithHistory[]> {
    const now = Date.now();
    if (leaderboardCache.gross && leaderboardCache.gross.expires > now) {
      return leaderboardCache.gross.data;
    }
    // Batch fetch all players, results, and tournaments
    const [allPlayers, allResults, allTournaments] = await Promise.all([
      this.getAllPlayers(),
      this.getAllPlayerResults(),
      this.getAllTournaments()
    ]);
    const tournamentMap = new Map<number, Tournament>();
    allTournaments.forEach((t: Tournament) => tournamentMap.set(t.id, t));
    // Group results by playerId
    const resultsByPlayer = new Map<number, PlayerResult[]>();
    for (const result of allResults) {
      if (!resultsByPlayer.has(result.playerId)) resultsByPlayer.set(result.playerId, []);
      resultsByPlayer.get(result.playerId)!.push(result);
    }
    const leaderboard: PlayerWithHistory[] = [];
    for (const player of allPlayers) {
      const results = resultsByPlayer.get(player.id) || [];
      if (!results.length) continue;
      const playerHistory = await this.calculatePlayerHistoryBatch(player, results, tournamentMap, 'gross');
      if (playerHistory && (playerHistory.grossTop8TotalPoints || 0) > 0) {
        leaderboard.push(playerHistory);
      }
    }
    leaderboard.sort((a, b) => {
      const grossTop8PointsA = a.grossTop8TotalPoints || 0;
      const grossTop8PointsB = b.grossTop8TotalPoints || 0;
      if (grossTop8PointsB !== grossTop8PointsA) return grossTop8PointsB - grossTop8PointsA;
      const handicapA = a.player.defaultHandicap || 999;
      const handicapB = b.player.defaultHandicap || 999;
      return handicapA - handicapB;
    });
    leaderboard.forEach((player, index) => { player.rank = index + 1; });
    leaderboardCache.gross = { data: leaderboard, expires: Date.now() + LEADERBOARD_CACHE_TTL_MS };
    return leaderboard;
  }

  /**
   * Calculate top 8 events points from tournament details
   * @param tournamentDetails Array of tournament result details for a player
   * @param scoreType 'net' or 'gross' - determines which points field to use
   * @returns Object with totalPoints, majorPoints, and tourPoints for top 8 events
   */
  private calculateTop8Points(
    tournamentDetails: Array<{
      [key: string]: any;
      points: number;
      grossPoints: number;
      tournamentType: string;
    }>,
    scoreType: 'net' | 'gross'
  ): {
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
   * (Replaced with shared utility)
   * @param position Player's finishing position
   * @param tournamentType Type of tournament (major, tour, league, supr)
   * @returns Points awarded for the position and tournament type
   */
  calculatePointsForPosition(position: number, tournamentType: string): number {
    // Use TournamentType type union for safety
    if (!['major', 'tour', 'league', 'supr'].includes(tournamentType)) return 0;
    return calculatePoints(
      Number(position),
      tournamentType as TournamentType,
      this.pointsConfig[tournamentType as keyof PointsConfig]
    );
  }

  // Helper methods for database access
  /**
   * Get a player by ID
   */
  private async getPlayer(id: number): Promise<(Player & { homeClub?: string | null }) | undefined> {
    const [player] = await db.select({
      id: players.id,
      name: players.name,
      email: players.email,
      defaultHandicap: players.defaultHandicap,
      createdAt: players.createdAt,
      homeClub: users.homeClub,
    })
    .from(players)
    .leftJoin(playerProfiles, eq(players.id, playerProfiles.playerId))
    .leftJoin(users, eq(playerProfiles.userId, users.id))
    .where(eq(players.id, id));
    return player;
  }

  /**
   * Get all players with homeClub information
   */
  private async getAllPlayers(): Promise<(Player & { homeClub?: string | null })[]> {
    return db.select({
      id: players.id,
      name: players.name,
      email: players.email,
      defaultHandicap: players.defaultHandicap,
      createdAt: players.createdAt,
      homeClub: users.homeClub,
    })
    .from(players)
    .leftJoin(playerProfiles, eq(players.id, playerProfiles.playerId))
    .leftJoin(users, eq(playerProfiles.userId, users.id))
    .orderBy(players.name);
  }

  /**
   * Get all results for a player
   */
  private async getPlayerResults(playerId: number): Promise<PlayerResult[]> {
    return db.select({
      id: playerResults.id,
      playerId: playerResults.playerId,
      tournamentId: playerResults.tournamentId,
      position: playerResults.position,
      grossPosition: playerResults.grossPosition,
      grossScore: playerResults.grossScore,
      netScore: playerResults.netScore,
      handicap: playerResults.handicap,
      points: playerResults.points,
      grossPoints: playerResults.grossPoints,
      createdAt: playerResults.createdAt,
    })
      .from(playerResults)
      .where(eq(playerResults.playerId, playerId));
  }

  /**
   * Get all player results
   */
  private async getAllPlayerResults(): Promise<PlayerResult[]> {
    return db.select({
      id: playerResults.id,
      playerId: playerResults.playerId,
      tournamentId: playerResults.tournamentId,
      position: playerResults.position,
      grossPosition: playerResults.grossPosition,
      grossScore: playerResults.grossScore,
      netScore: playerResults.netScore,
      handicap: playerResults.handicap,
      points: playerResults.points,
      grossPoints: playerResults.grossPoints,
      createdAt: playerResults.createdAt,
    }).from(playerResults);
  }
  /**
   * Get all tournaments
   */
  private async getAllTournaments(): Promise<Tournament[]> {
    return db.select().from(tournaments);
  }

  /**
   * Batch version of calculatePlayerHistory for leaderboard generation
   * @param player Player object
   * @param results Array of PlayerResult
   * @param tournamentMap Map of tournamentId to Tournament
   * @param scoreType 'net' or 'gross'
   * @returns PlayerWithHistory or undefined
   */
  private async calculatePlayerHistoryBatch(
    player: Player,
    results: PlayerResult[],
    tournamentMap: Map<number, Tournament>,
    scoreType: 'net' | 'gross'
  ): Promise<PlayerWithHistory | undefined> {
    if (!results.length) return undefined;

    const tournamentDetails = [];
    let totalPoints = 0;
    let majorPoints = 0;
    let tourPoints = 0;
    let leaguePoints = 0;
    let suprPoints = 0;
    let totalNetScores = 0;
    let totalGrossScores = 0;
    let scoreCount = 0;

    for (const result of results) {
      const tournament = tournamentMap.get(result.tournamentId);
      if (!tournament) continue;

      const netScore = result.netScore;
      const grossScore = result.netScore !== null && result.handicap !== null ? result.netScore + result.handicap : null;

      if (netScore !== null) {
        totalNetScores += netScore;
        if (grossScore !== null) totalGrossScores += grossScore;
        scoreCount++;
      }

      const pointsToUse = scoreType === 'gross' ? (result.grossPoints || 0) : (result.points || 0);

      const tournamentDetail = {
        id: result.id,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        tournamentDate: tournament.date,
        tournamentType: tournament.type,
        position: result.position,
        grossPosition: result.grossPosition || result.position,
        netScore: netScore,
        grossScore: grossScore,
        handicap: result.handicap,
        points: pointsToUse,
        grossPoints: result.grossPoints || 0,
        netPoints: result.points || 0
      };

      tournamentDetails.push(tournamentDetail);
      totalPoints += pointsToUse;

      switch (tournament.type) {
        case 'major': majorPoints += pointsToUse; break;
        case 'tour': tourPoints += pointsToUse; break;
        case 'league': leaguePoints += pointsToUse; break;
        case 'supr': suprPoints += pointsToUse; break;
      }
    }

    const averageNetScore = scoreCount > 0 ? totalNetScores / scoreCount : 0;
    const averageGrossScore = scoreCount > 0 ? totalGrossScores / scoreCount : 0;

    const resultObj: any = {
      player: {
        id: player.id,
        name: player.name,
        email: player.email,
        defaultHandicap: player.defaultHandicap,
        homeClub: (player as any).homeClub
      },
      tournaments: tournamentDetails,
      totalPoints,
      majorPoints,
      tourPoints,
      leaguePoints,
      suprPoints,
      totalEvents: tournamentDetails.length,
      rank: 0,
      averageNetScore,
      averageGrossScore,
      averageScore: scoreType === 'net' ? averageNetScore : averageGrossScore
    };

    const top8Results = this.calculateTop8Points(tournamentDetails, scoreType);

    if (scoreType === 'gross') {
      return {
        ...resultObj,
        grossTotalPoints: totalPoints,
        grossTourPoints: tourPoints,
        grossTop8TotalPoints: top8Results.totalPoints,
        grossTop8TourPoints: top8Results.tourPoints,
        grossTop8MajorPoints: top8Results.majorPoints
      };
    }

    return {
      ...resultObj,
      top8TotalPoints: top8Results.totalPoints,
      top8TourPoints: top8Results.tourPoints,
      top8MajorPoints: top8Results.majorPoints
    };
  }
}