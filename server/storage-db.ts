import { and, eq, desc, sql, inArray } from "drizzle-orm";
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
    
    // Group players: with valid scores vs without valid scores
    const playersWithValidScores: PlayerWithHistory[] = [];
    const playersWithoutValidScores: PlayerWithHistory[] = [];
    
    leaderboard.forEach(player => {
      // Check if player has a valid gross score
      const hasValidScore = player.averageGrossScore !== undefined && 
                           player.averageGrossScore !== null && 
                           !isNaN(player.averageGrossScore) &&
                           player.tournaments.some(t => t.grossScore !== null && t.grossScore !== undefined);
      
      if (hasValidScore) {
        playersWithValidScores.push(player);
      } else {
        playersWithoutValidScores.push(player);
      }
    });
    
    // Sort players with valid scores by average gross score (low to high)
    playersWithValidScores.sort((a, b) => {
      const aScore = a.averageGrossScore || 999;
      const bScore = b.averageGrossScore || 999;
      
      if (aScore === bScore) {
        return b.totalPoints - a.totalPoints; // Secondary sort by points (higher is better)
      }
      
      return aScore - bScore; // Primary sort by gross score (lower is better)
    });
    
    // Sort players without valid scores alphabetically
    playersWithoutValidScores.sort((a, b) => {
      return a.player.name.localeCompare(b.player.name);
    });
    
    // Tour points table for gross leaderboard positions (from Founders Series Tour Points List)
    const tourPointsTable = [
      500, 300, 190, 135, 110, 100, 90, 85, 80, 75,    // 1-10
      70, 65, 60, 55, 53, 51, 49, 47, 45, 43,          // 11-20
      41, 39, 37, 35.5, 34, 32.5, 31, 29.5, 28, 26.5,  // 21-30
      25, 23.5, 22, 21, 20, 19, 18, 17, 16, 15,        // 31-40
      14, 13, 12, 11, 10.5, 10, 9.5, 9, 8.5, 8         // 41-50
    ];
    
    // Get all tournaments to get results for calculating the gross points
    const tournaments = await this.getTournaments();
    const allResults: PlayerResult[] = [];
    
    // Get all player results for all tournaments
    for (const tournament of tournaments) {
      if (tournament.status === 'completed') {
        const results = await this.getPlayerResultsByTournament(tournament.id);
        allResults.push(...results);
      }
    }
    
    // First, calculate tour points for each individual tour tournament
    const tourTournaments = tournaments.filter(t => t.type === 'tour' && t.status === 'completed');
    
    // Store gross tour points per player
    const playerGrossTourPoints: Record<number, number> = {};
    
    // Process each tour tournament separately to calculate gross points
    for (const tournament of tourTournaments) {
      // Get results for this tournament
      const tournamentResults = allResults.filter(r => r.tournamentId === tournament.id);
      
      // Create a list of player results for this tournament that have valid gross scores
      const validGrossResults = tournamentResults
        .filter(r => r.grossScore !== null && r.grossScore !== undefined)
        .sort((a, b) => {
          // Sort by gross score (lower is better)
          const aScore = a.grossScore || 999;
          const bScore = b.grossScore || 999;
          return aScore - bScore;
        });
      
      // Assign points based on position in this tournament
      validGrossResults.forEach((result, position) => {
        if (position < tourPointsTable.length) {
          const points = tourPointsTable[position];
          
          // Add these points to the player's total gross tour points
          if (!playerGrossTourPoints[result.playerId]) {
            playerGrossTourPoints[result.playerId] = 0;
          }
          
          playerGrossTourPoints[result.playerId] += points;
        }
      });
    }
    
    // Now assign ranks and calculate total gross points
    leaderboard.forEach((player, index) => {
      // Assign rank based on position in the sorted list
      player.rank = index + 1;
      
      // Get this player's calculated gross tour points
      const grossTourPoints = playerGrossTourPoints[player.player.id] || 0;
      
      // Set the gross tour points
      player.grossTourPoints = grossTourPoints;
      
      // Calculate the gross total points
      player.grossTotalPoints = player.majorPoints + grossTourPoints + player.leaguePoints + player.suprPoints;
      
      // Log player data for debugging (only top players)
      if (index < 3) {
        console.log(`Player #${index+1} ${player.player.name}: majorPoints=${player.majorPoints}, netTour=${player.tourPoints}, grossTour=${player.grossTourPoints}, league=${player.leaguePoints}, supr=${player.suprPoints}, grossTotal=${player.grossTotalPoints}`);
      }
    });
    
    // Now sort by grossTourPoints (highest to lowest)
    leaderboard.sort((a, b) => (b.grossTourPoints || 0) - (a.grossTourPoints || 0));
    
    // Re-assign ranks after sorting
    leaderboard.forEach((player, index) => {
      player.rank = index + 1;
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
    
    // Get tournament IDs from player results
    const tournamentIds = results.map(r => r.tournamentId);
    
    // Handle the query properly for tournament IDs
    let tournamentsList = [];
    
    // Get tournaments one by one to avoid SQL injection issues with IN clause
    for (const id of tournamentIds) {
      const tournamentsForId = await db.select()
        .from(tournaments)
        .where(eq(tournaments.id, id));
      
      tournamentsList = [...tournamentsList, ...tournamentsForId];
    }
    
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
    
    // First, calculate gross positions for each tournament
    const tournamentResultsMap = new Map<number, PlayerResult[]>();
    const grossPositionsMap = new Map<string, number>(); // Map of "tournamentId-playerId" -> grossPosition
    
    // For each tournament this player participated in
    for (const result of results) {
      const tournament = tournamentMap.get(result.tournamentId);
      if (!tournament) continue;
      
      // Get all results for this tournament if not already fetched
      if (!tournamentResultsMap.has(tournament.id)) {
        const tournamentResults = await this.getPlayerResultsByTournament(tournament.id);
        tournamentResultsMap.set(tournament.id, tournamentResults);
        
        // Filter to only results with valid gross scores and sort by gross score
        const validGrossResults = tournamentResults
          .filter(r => r.grossScore !== null && r.grossScore !== undefined)
          .sort((a, b) => {
            if (!a.grossScore || !b.grossScore) return 0;
            return a.grossScore - b.grossScore; // Lower score is better
          });
        
        // Assign gross positions for this tournament
        validGrossResults.forEach((result, index) => {
          const key = `${tournament.id}-${result.playerId}`;
          grossPositionsMap.set(key, index + 1);
        });
      }
    }
    
    // Now process each result with the calculated gross positions
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
      
      // Get this player's gross position in this tournament
      const grossPositionKey = `${tournament.id}-${result.playerId}`;
      const grossPosition = grossPositionsMap.get(grossPositionKey);
      
      // Create tournament detail with the appropriate score type
      const tournamentDetail: any = {
        id: result.id,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        tournamentDate: tournament.date,
        tournamentType: tournament.type,
        position: result.position, // Net position
        grossPosition: grossPosition || null, // Gross position
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