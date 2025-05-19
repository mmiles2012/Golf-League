import { and, eq, desc, sql } from "drizzle-orm";
import { 
  type Player, 
  type Tournament, 
  type PlayerResult,
  type InsertPlayer,
  type InsertTournament,
  type InsertPlayerResult,
  type EditTournament,
  type PlayerWithHistory,
  players,
  tournaments,
  playerResults
} from "@shared/schema";
import { db } from "./db";
import { IStorage } from "./storage";
// Use points calculator from client lib for consistency 
import { calculatePoints } from "../client/src/lib/points-calculator";

export class DatabaseStorage implements IStorage {
  // Player operations
  async getPlayers(): Promise<Player[]> {
    return db.select().from(players).orderBy(players.name);
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async findPlayerByName(name: string): Promise<Player | undefined> {
    const [player] = await db.select()
      .from(players)
      .where(sql`lower(${players.name}) = lower(${name})`);
    return player;
  }

  async searchPlayersByName(query: string): Promise<Player[]> {
    return db.select()
      .from(players)
      .where(sql`${players.name} ILIKE ${'%' + query + '%'}`)
      .orderBy(players.name)
      .limit(20);
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [newPlayer] = await db.insert(players)
      .values(player)
      .returning();
    return newPlayer;
  }

  // Tournament operations
  async getTournaments(): Promise<Tournament[]> {
    return db.select()
      .from(tournaments)
      .orderBy(desc(tournaments.date));
  }

  async getTournament(id: number): Promise<Tournament | undefined> {
    const [tournament] = await db.select()
      .from(tournaments)
      .where(eq(tournaments.id, id));
    return tournament;
  }

  async createTournament(tournament: InsertTournament): Promise<Tournament> {
    const [newTournament] = await db.insert(tournaments)
      .values({
        ...tournament,
        date: new Date(tournament.date).toISOString().split('T')[0],
      })
      .returning();
    return newTournament;
  }

  async updateTournament(id: number, tournamentData: Partial<InsertTournament>): Promise<Tournament | undefined> {
    // Handle date conversion if provided
    const updateData = { ...tournamentData };
    if (updateData.date) {
      updateData.date = new Date(updateData.date).toISOString().split('T')[0];
    }

    const [updatedTournament] = await db.update(tournaments)
      .set(updateData)
      .where(eq(tournaments.id, id))
      .returning();
    
    return updatedTournament;
  }

  async deleteTournament(id: number): Promise<boolean> {
    const [deletedTournament] = await db.delete(tournaments)
      .where(eq(tournaments.id, id))
      .returning();
    
    return !!deletedTournament;
  }

  // Player result operations
  async getPlayerResults(): Promise<PlayerResult[]> {
    return db.select().from(playerResults);
  }

  async getPlayerResult(id: number): Promise<PlayerResult | undefined> {
    const [result] = await db.select()
      .from(playerResults)
      .where(eq(playerResults.id, id));
    return result;
  }

  async getPlayerResultsByTournament(tournamentId: number): Promise<PlayerResult[]> {
    return db.select()
      .from(playerResults)
      .where(eq(playerResults.tournamentId, tournamentId))
      .orderBy(playerResults.position);
  }

  async getPlayerResultsByPlayer(playerId: number): Promise<PlayerResult[]> {
    return db.select()
      .from(playerResults)
      .where(eq(playerResults.playerId, playerId));
  }

  async createPlayerResult(result: InsertPlayerResult): Promise<PlayerResult> {
    const [newResult] = await db.insert(playerResults)
      .values(result)
      .returning();
    return newResult;
  }

  async updatePlayerResult(id: number, result: Partial<InsertPlayerResult>): Promise<PlayerResult | undefined> {
    const [updatedResult] = await db.update(playerResults)
      .set(result)
      .where(eq(playerResults.id, id))
      .returning();
    
    return updatedResult;
  }

  async deletePlayerResult(id: number): Promise<boolean> {
    const [deletedResult] = await db.delete(playerResults)
      .where(eq(playerResults.id, id))
      .returning();
    
    return !!deletedResult;
  }

  async deletePlayerResultsByTournament(tournamentId: number): Promise<boolean> {
    await db.delete(playerResults)
      .where(eq(playerResults.tournamentId, tournamentId));
    
    return true;
  }

  // Combined operations
  async getNetLeaderboard(): Promise<PlayerWithHistory[]> {
    const allPlayers = await this.getPlayers();
    const leaderboard: PlayerWithHistory[] = [];
    
    for (const player of allPlayers) {
      const playerHistory = await this.calculatePlayerHistory(player.id, 'net');
      if (playerHistory) {
        leaderboard.push(playerHistory);
      }
    }
    
    // For the net leaderboard, we sort primarily by points
    // This retains the original behavior - highest points at the top
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
    
    // Assign ranks
    leaderboard.forEach((player, index) => {
      player.rank = index + 1;
    });
    
    return leaderboard;
  }

  async getGrossLeaderboard(): Promise<PlayerWithHistory[]> {
    const allPlayers = await this.getPlayers();
    const leaderboard: PlayerWithHistory[] = [];
    
    for (const player of allPlayers) {
      // Always use 'gross' for score type to ensure proper sorting
      const playerHistory = await this.calculatePlayerHistory(player.id, 'gross');
      if (playerHistory) {
        // Make sure we have a clean slate for the gross points
        playerHistory.grossTourPoints = 0;
        playerHistory.grossTotalPoints = 0;
        leaderboard.push(playerHistory);
      }
    }
    
    console.log("Gross leaderboard players count:", leaderboard.length);
    
    // For gross leaderboard, sort by average gross score (ascending, lower is better)
    // If scores are equal, use points as a tiebreaker (descending)
    leaderboard.sort((a, b) => {
      // Use the averageGrossScore which ensures we're using gross scores
      const aScore = a.averageGrossScore !== undefined ? a.averageGrossScore : 999;
      const bScore = b.averageGrossScore !== undefined ? b.averageGrossScore : 999;
      
      if (aScore === bScore) {
        return b.totalPoints - a.totalPoints; // Secondary sort by points (higher is better)
      }
      return aScore - bScore; // Primary sort by gross score (lower is better)
    });
    
    // Tour points table for gross leaderboard positions
    const tourPointsTable = [
      500, 300, 190, 135, 110, 100, 90, 85, 80, 75, // 1-10
      70, 65, 60, 57, 55, 53, 51, 50, 49, 48,       // 11-20
      47, 46, 45, 44, 43, 42, 41, 40, 39, 38,       // 21-30
      37, 36, 35, 34, 33, 32, 31, 30, 29, 28,       // 31-40
      27, 26, 25, 24, 23, 22, 21, 20, 19, 18        // 41-50
    ];
    
    // First, assign gross tour points based on position
    leaderboard.forEach((player, index) => {
      // Assign rank based on gross score position
      player.rank = index + 1;
      
      // Store the original tour points for calculations
      const originalTourPoints = player.tourPoints;
      
      // Assign Tour points based on gross position (first place gets 500 points)
      if (index < tourPointsTable.length) {
        // Calculate the new gross-based tour points
        const grossPositionPoints = tourPointsTable[index];
        
        // Create a separate record of gross tour points
        player.grossTourPoints = grossPositionPoints;
        
        // Replace regular tour points with gross tour points for total calculation
        // This properly reflects the gross-based total points
        player.grossTotalPoints = player.majorPoints + grossPositionPoints + player.leaguePoints + player.suprPoints;
      } else {
        // For players without gross tour points, set to 0
        player.grossTourPoints = 0;
        player.grossTotalPoints = player.majorPoints + player.leaguePoints + player.suprPoints;
      }
      
      // Log player data if it's one of the top players
      if (index < 3) {
        console.log(`Player #${index+1} ${player.player.name}: majorPoints=${player.majorPoints}, originalTour=${originalTourPoints}, grossTour=${player.grossTourPoints}, league=${player.leaguePoints}, supr=${player.suprPoints}, grossTotal=${player.grossTotalPoints}`);
      }
    });
    
    return leaderboard;
  }

  async getPlayerWithHistory(playerId: number): Promise<PlayerWithHistory | undefined> {
    const player = await this.getPlayer(playerId);
    
    if (!player) {
      return undefined;
    }
    
    // Default to net leaderboard calculation
    return this.calculatePlayerHistory(playerId, 'net');
  }

  async processEditTournament(data: EditTournament): Promise<Tournament | undefined> {
    const { id, name, date, type, results } = data;
    
    // Update tournament info
    const tournament = await this.updateTournament(id, {
      name,
      date,
      type
    });
    
    if (!tournament) {
      return undefined;
    }
    
    // Delete existing results for this tournament
    await this.deletePlayerResultsByTournament(id);
    
    // Create new results
    for (const result of results) {
      await this.createPlayerResult({
        playerId: result.playerId,
        tournamentId: id,
        position: result.position,
        grossScore: result.grossScore || null,
        netScore: result.netScore || null,
        handicap: result.handicap || null,
        points: result.points || calculatePoints(result.position, type),
      });
    }
    
    return tournament;
  }

  // Helper methods
  private async calculatePlayerHistory(playerId: number, scoreType: 'net' | 'gross'): Promise<PlayerWithHistory | undefined> {
    const player = await this.getPlayer(playerId);
    
    if (!player) {
      return undefined;
    }
    
    const results = await this.getPlayerResultsByPlayer(playerId);
    
    if (!results.length) {
      return undefined;
    }
    
    const tournamentIds = results.map(r => r.tournamentId);
    const tournamentsList = await db.select()
      .from(tournaments)
      .where(sql`${tournaments.id} IN (${tournamentIds.join(',')})`);
    
    const tournamentMap = new Map<number, Tournament>();
    tournamentsList.forEach(t => tournamentMap.set(t.id, t));
    
    const tournamentDetails = [];
    let totalPoints = 0;
    let majorPoints = 0;
    let tourPoints = 0;
    let leaguePoints = 0;
    let suprPoints = 0;
    
    // Track scores for averaging
    let totalGrossScore = 0;
    let countGrossScores = 0;
    let totalNetScore = 0;
    let countNetScores = 0;
    
    for (const result of results) {
      const tournament = tournamentMap.get(result.tournamentId);
      
      if (!tournament) {
        continue;
      }
      
      // Track scores for average calculation based on scoreType
      if (result.grossScore !== null) {
        totalGrossScore += result.grossScore;
        countGrossScores++;
      }
      
      if (result.netScore !== null) {
        totalNetScore += result.netScore;
        countNetScores++;
      }
      
      // Create tournament detail with the appropriate score type
      const tournamentDetail: any = {
        id: result.id,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        tournamentDate: tournament.date,
        tournamentType: tournament.type,
        position: result.position,
        grossScore: result.grossScore,
        netScore: result.netScore,
        handicap: result.handicap,
        points: result.points
      };
      
      // Display appropriate score based on the scoreType for consistency in the UI
      if (scoreType === 'net') {
        tournamentDetail.displayScore = result.netScore;
      } else {
        tournamentDetail.displayScore = result.grossScore;
      }
      
      tournamentDetails.push(tournamentDetail);
      
      totalPoints += result.points;
      
      // Add points to specific category counters
      switch (tournament.type) {
        case 'major':
          majorPoints += result.points;
          break;
        case 'tour':
          tourPoints += result.points;
          break;
        case 'league':
          leaguePoints += result.points;
          break;
        case 'supr':
          suprPoints += result.points;
          break;
      }
    }
    
    // Calculate average scores based on type
    const averageGrossScore = countGrossScores > 0 ? totalGrossScore / countGrossScores : 999; // Use high number for those without scores
    const averageNetScore = countNetScores > 0 ? totalNetScore / countNetScores : 999;
    
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
      rank: 0, // Will be set after sorting
      averageGrossScore,
      averageNetScore,
      // Display either gross or net score based on the leaderboard type
      averageScore: scoreType === 'gross' ? averageGrossScore : averageNetScore
    };
  }
}