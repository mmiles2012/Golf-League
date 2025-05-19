import {
  Player,
  InsertPlayer,
  Tournament,
  InsertTournament,
  PlayerResult,
  InsertPlayerResult,
  TournamentType,
  PlayerWithHistory,
  EditTournament,
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // Player operations
  getPlayers(): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  findPlayerByName(name: string): Promise<Player | undefined>;
  searchPlayersByName(query: string): Promise<Player[]>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  
  // Tournament operations
  getTournaments(): Promise<Tournament[]>;
  getTournament(id: number): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: number, tournament: Partial<InsertTournament>): Promise<Tournament | undefined>;
  deleteTournament(id: number): Promise<boolean>;
  
  // Player result operations
  getPlayerResults(): Promise<PlayerResult[]>;
  getPlayerResult(id: number): Promise<PlayerResult | undefined>;
  getPlayerResultsByTournament(tournamentId: number): Promise<PlayerResult[]>;
  getPlayerResultsByPlayer(playerId: number): Promise<PlayerResult[]>;
  createPlayerResult(result: InsertPlayerResult): Promise<PlayerResult>;
  updatePlayerResult(id: number, result: Partial<InsertPlayerResult>): Promise<PlayerResult | undefined>;
  deletePlayerResult(id: number): Promise<boolean>;
  deletePlayerResultsByTournament(tournamentId: number): Promise<boolean>;
  
  // Combined operations
  getNetLeaderboard(): Promise<PlayerWithHistory[]>;
  getGrossLeaderboard(): Promise<PlayerWithHistory[]>;
  getPlayerWithHistory(playerId: number): Promise<PlayerWithHistory | undefined>;
  processEditTournament(data: EditTournament): Promise<Tournament | undefined>;
}

export class MemStorage implements IStorage {
  private players: Map<number, Player>;
  private tournaments: Map<number, Tournament>;
  private playerResults: Map<number, PlayerResult>;
  private playerCurrentId: number;
  private tournamentCurrentId: number;
  private playerResultCurrentId: number;
  
  constructor() {
    this.players = new Map();
    this.tournaments = new Map();
    this.playerResults = new Map();
    this.playerCurrentId = 1;
    this.tournamentCurrentId = 1;
    this.playerResultCurrentId = 1;
    
    // Initialize with sample data for development
    this.initSampleData();
  }
  
  // Player methods
  async getPlayers(): Promise<Player[]> {
    return Array.from(this.players.values());
  }
  
  async getPlayer(id: number): Promise<Player | undefined> {
    return this.players.get(id);
  }
  
  async findPlayerByName(name: string): Promise<Player | undefined> {
    const normalizedName = name.toLowerCase().trim();
    return Array.from(this.players.values()).find(
      player => player.name.toLowerCase().trim() === normalizedName
    );
  }
  
  async searchPlayersByName(query: string): Promise<Player[]> {
    if (!query || query.trim() === '') {
      return [];
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    return Array.from(this.players.values()).filter(
      player => player.name.toLowerCase().includes(normalizedQuery)
    );
  }
  
  async createPlayer(player: InsertPlayer): Promise<Player> {
    const id = this.playerCurrentId++;
    const newPlayer: Player = { 
      id, 
      createdAt: new Date(),
      ...player 
    };
    this.players.set(id, newPlayer);
    return newPlayer;
  }
  
  // Tournament methods
  async getTournaments(): Promise<Tournament[]> {
    return Array.from(this.tournaments.values());
  }
  
  async getTournament(id: number): Promise<Tournament | undefined> {
    return this.tournaments.get(id);
  }
  
  async createTournament(tournament: InsertTournament): Promise<Tournament> {
    const id = this.tournamentCurrentId++;
    const newTournament: Tournament = {
      id,
      createdAt: new Date(),
      ...tournament
    };
    this.tournaments.set(id, newTournament);
    return newTournament;
  }
  
  async updateTournament(id: number, tournament: Partial<InsertTournament>): Promise<Tournament | undefined> {
    const existingTournament = this.tournaments.get(id);
    
    if (!existingTournament) {
      return undefined;
    }
    
    const updatedTournament = {
      ...existingTournament,
      ...tournament
    };
    
    this.tournaments.set(id, updatedTournament);
    return updatedTournament;
  }
  
  async deleteTournament(id: number): Promise<boolean> {
    const success = this.tournaments.delete(id);
    
    // Also delete all player results for this tournament
    if (success) {
      await this.deletePlayerResultsByTournament(id);
    }
    
    return success;
  }
  
  // Player result methods
  async getPlayerResults(): Promise<PlayerResult[]> {
    return Array.from(this.playerResults.values());
  }
  
  async getPlayerResult(id: number): Promise<PlayerResult | undefined> {
    return this.playerResults.get(id);
  }
  
  async getPlayerResultsByTournament(tournamentId: number): Promise<PlayerResult[]> {
    return Array.from(this.playerResults.values()).filter(
      result => result.tournamentId === tournamentId
    );
  }
  
  async getPlayerResultsByPlayer(playerId: number): Promise<PlayerResult[]> {
    return Array.from(this.playerResults.values()).filter(
      result => result.playerId === playerId
    );
  }
  
  async createPlayerResult(result: InsertPlayerResult): Promise<PlayerResult> {
    const id = this.playerResultCurrentId++;
    const newResult: PlayerResult = {
      id,
      createdAt: new Date(),
      ...result
    };
    this.playerResults.set(id, newResult);
    return newResult;
  }
  
  async updatePlayerResult(id: number, result: Partial<InsertPlayerResult>): Promise<PlayerResult | undefined> {
    const existingResult = this.playerResults.get(id);
    
    if (!existingResult) {
      return undefined;
    }
    
    const updatedResult = {
      ...existingResult,
      ...result
    };
    
    this.playerResults.set(id, updatedResult);
    return updatedResult;
  }
  
  async deletePlayerResult(id: number): Promise<boolean> {
    return this.playerResults.delete(id);
  }
  
  async deletePlayerResultsByTournament(tournamentId: number): Promise<boolean> {
    const resultsToDelete = Array.from(this.playerResults.values()).filter(
      result => result.tournamentId === tournamentId
    );
    
    for (const result of resultsToDelete) {
      this.playerResults.delete(result.id);
    }
    
    return true;
  }
  
  // Combined operations
  async getNetLeaderboard(): Promise<PlayerWithHistory[]> {
    const players = await this.getPlayers();
    const leaderboard: PlayerWithHistory[] = [];
    
    for (const player of players) {
      const playerHistory = await this.calculatePlayerHistory(player.id, 'net');
      if (playerHistory) {
        leaderboard.push(playerHistory);
      }
    }
    
    // Sort by total points descending
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
    
    // Assign ranks
    leaderboard.forEach((player, index) => {
      player.rank = index + 1;
    });
    
    return leaderboard;
  }
  
  async getGrossLeaderboard(): Promise<PlayerWithHistory[]> {
    const players = await this.getPlayers();
    const leaderboard: PlayerWithHistory[] = [];
    
    for (const player of players) {
      const playerHistory = await this.calculatePlayerHistory(player.id, 'gross');
      if (playerHistory) {
        leaderboard.push(playerHistory);
      }
    }
    
    // Sort by total points descending
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
    
    // Assign ranks
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
      date: new Date(date),
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
        grossScore: result.grossScore,
        netScore: result.netScore,
        handicap: result.handicap,
        points: result.points || 0 // Use provided points or calculate them
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
    
    const tournaments = await this.getTournaments();
    const tournamentMap = new Map<number, Tournament>();
    tournaments.forEach(tournament => tournamentMap.set(tournament.id, tournament));
    
    const tournamentDetails = [];
    let totalPoints = 0;
    let majorPoints = 0;
    let tourPoints = 0;
    let leaguePoints = 0;
    let suprPoints = 0;
    
    for (const result of results) {
      const tournament = tournamentMap.get(result.tournamentId);
      
      if (!tournament) {
        continue;
      }
      
      tournamentDetails.push({
        id: result.id,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        tournamentDate: tournament.date.toISOString().split('T')[0],
        tournamentType: tournament.type,
        position: result.position,
        grossScore: result.grossScore,
        netScore: result.netScore,
        handicap: result.handicap,
        points: result.points
      });
      
      totalPoints += result.points;
      
      // Categorize points by tournament type
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
      rank: 0 // Will be assigned later
    };
  }
  
  // Initialize with sample data for development
  private initSampleData() {
    // Sample players
    const samplePlayers: InsertPlayer[] = [
      { name: "Michael Johnson", defaultHandicap: 5 },
      { name: "David Thompson", defaultHandicap: 6 },
      { name: "Robert Wilson", defaultHandicap: 7 },
      { name: "James Davis", defaultHandicap: 3 },
      { name: "Thomas Miller", defaultHandicap: 8 },
      { name: "William Brown", defaultHandicap: 4 },
      { name: "Richard Taylor", defaultHandicap: 9 },
      { name: "Daniel Martinez", defaultHandicap: 2 },
      { name: "Christopher Anderson", defaultHandicap: 7 },
      { name: "Joseph White", defaultHandicap: 5 }
    ];
    
    // Create sample players
    samplePlayers.forEach(player => {
      this.createPlayer(player);
    });
    
    // Sample tournaments
    const sampleTournaments: InsertTournament[] = [
      { name: "Summer Major", date: new Date("2023-08-12"), type: "major", status: "completed" },
      { name: "Spring Championship", date: new Date("2023-05-20"), type: "major", status: "completed" },
      { name: "Hideout Open", date: new Date("2023-07-08"), type: "tour", status: "completed" },
      { name: "Metro Invitational", date: new Date("2023-06-10"), type: "tour", status: "completed" },
      { name: "May Match Play", date: new Date("2023-05-06"), type: "tour", status: "completed" },
      { name: "Spring League Event", date: new Date("2023-04-15"), type: "league", status: "completed" },
      { name: "Summer League Event", date: new Date("2023-06-24"), type: "league", status: "completed" },
      { name: "SUPR Club Challenge", date: new Date("2023-07-22"), type: "supr", status: "completed" },
      { name: "Fall Championship", date: new Date("2023-09-16"), type: "major", status: "upcoming" }
    ];
    
    // Create sample tournaments
    const createdTournaments: Tournament[] = [];
    sampleTournaments.forEach(tournament => {
      const createdTournament = this.createTournament(tournament);
      createdTournaments.push(createdTournament);
    });
  }
}

// Use DatabaseStorage for database persistence
import { DatabaseStorage } from "./storage-db";
export const storage = new DatabaseStorage();
