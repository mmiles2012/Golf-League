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
  PointsConfig,
  AppSettings,
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
  
  // Points configuration operations
  getPointsConfig(): Promise<PointsConfig>;
  updatePointsConfig(config: PointsConfig): Promise<PointsConfig>;
  
  // App settings operations
  getAppSettings(): Promise<AppSettings>;
  updateAppSettings(settings: AppSettings): Promise<AppSettings>;
  
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
  private pointsConfig: PointsConfig;
  private appSettings: AppSettings;
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
    
    // Initialize default app settings
    this.appSettings = {
      appName: "Hideout Golf League",
      pageTitle: "Leaderboards",
      scoringType: "both",
      sidebarColor: "#0f172a",
      logoUrl: "/images/hideout-logo.png"
    };
    
    // Initialize default points configuration
    this.pointsConfig = {
      major: [
        { position: 1, points: 2000 },
        { position: 2, points: 1200 },
        { position: 3, points: 760 },
        { position: 4, points: 540 },
        { position: 5, points: 440 },
        { position: 6, points: 400 },
        { position: 7, points: 360 },
        { position: 8, points: 340 },
        { position: 9, points: 320 },
        { position: 10, points: 300 },
        { position: 11, points: 280 },
        { position: 12, points: 260 },
        { position: 13, points: 240 },
        { position: 14, points: 220 },
        { position: 15, points: 200 },
        { position: 16, points: 180 },
        { position: 17, points: 170 },
        { position: 18, points: 160 },
        { position: 19, points: 150 },
        { position: 20, points: 140 },
        { position: 21, points: 130 },
        { position: 22, points: 120 },
        { position: 23, points: 110 },
        { position: 24, points: 100 },
        { position: 25, points: 90 },
        { position: 26, points: 85 },
        { position: 27, points: 80 },
        { position: 28, points: 75 },
        { position: 29, points: 70 },
        { position: 30, points: 65 },
      ],
      tour: [
        { position: 1, points: 500 },
        { position: 2, points: 300 },
        { position: 3, points: 190 },
        { position: 4, points: 135 },
        { position: 5, points: 110 },
        { position: 6, points: 100 },
        { position: 7, points: 90 },
        { position: 8, points: 85 },
        { position: 9, points: 80 },
        { position: 10, points: 75 },
        { position: 11, points: 70 },
        { position: 12, points: 68 },
        { position: 13, points: 66 },
        { position: 14, points: 64 },
        { position: 15, points: 62 },
        { position: 16, points: 60 },
        { position: 17, points: 58 },
        { position: 18, points: 56 },
        { position: 19, points: 54 },
        { position: 20, points: 52 },
        { position: 21, points: 50 },
        { position: 22, points: 47.5 },
        { position: 23, points: 45 },
        { position: 24, points: 42.5 },
        { position: 25, points: 40 },
        { position: 26, points: 37.5 },
        { position: 27, points: 35 },
        { position: 28, points: 32.5 },
        { position: 29, points: 30 },
        { position: 30, points: 27.5 },
      ],
      league: [
        { position: 1, points: 250 },
        { position: 2, points: 150 },
        { position: 3, points: 95 },
        { position: 4, points: 67.5 },
        { position: 5, points: 55 },
        { position: 6, points: 50 },
        { position: 7, points: 45 },
        { position: 8, points: 42.5 },
        { position: 9, points: 40 },
        { position: 10, points: 37.5 },
        { position: 11, points: 35 },
        { position: 12, points: 34 },
        { position: 13, points: 33 },
        { position: 14, points: 32 },
        { position: 15, points: 31 },
        { position: 16, points: 30 },
        { position: 17, points: 29 },
        { position: 18, points: 28 },
        { position: 19, points: 27 },
        { position: 20, points: 26 },
      ],
      supr: [
        { position: 1, points: 150 },
        { position: 2, points: 90 },
        { position: 3, points: 57 },
        { position: 4, points: 40.5 },
        { position: 5, points: 33 },
        { position: 6, points: 30 },
        { position: 7, points: 27 },
        { position: 8, points: 25.5 },
        { position: 9, points: 24 },
        { position: 10, points: 22.5 },
        { position: 11, points: 21 },
        { position: 12, points: 20.4 },
        { position: 13, points: 19.8 },
        { position: 14, points: 19.2 },
        { position: 15, points: 18.6 },
        { position: 16, points: 18 },
        { position: 17, points: 17.4 },
        { position: 18, points: 16.8 },
        { position: 19, points: 16.2 },
        { position: 20, points: 15.6 },
      ]
    };
    
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
  
  // Points configuration operations
  async getPointsConfig(): Promise<PointsConfig> {
    // Return a deep copy of the configuration to prevent direct modification
    return JSON.parse(JSON.stringify(this.pointsConfig));
  }
  
  async updatePointsConfig(config: PointsConfig): Promise<PointsConfig> {
    // Update the points configuration
    this.pointsConfig = JSON.parse(JSON.stringify(config));
    return this.getPointsConfig();
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
