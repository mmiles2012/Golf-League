import { and, eq, desc, sql, inArray } from "drizzle-orm";
import {
  leagues,
  type League,
  type InsertLeague,
  type Player, 
  type Tournament, 
  type PlayerResult,
  type InsertPlayer,
  type InsertTournament,
  type InsertPlayerResult,
  type EditTournament,
  type PlayerWithHistory,
  type PointsConfig,
  type AppSettings,
  type User,
  type UpsertUser,
  type UpdateUserProfile,
  type PlayerProfile,
  type PlayerProfileLink,
  type PlayerLinkRequest,
  players,
  tournaments,
  playerResults,
  users,
  playerProfiles,
  playerLinkRequests
} from "@shared/schema";
import { db } from "./db";
import { IStorage } from "./storage";
import { LeaderboardCalculator } from "./leaderboard-calculator";
import { calculatePoints } from "./utils";

// Default points configurations based on provided PDFs
const DEFAULT_POINTS_CONFIG = {
  major: [
    // Values from Majors Points List PDF
    { position: 1, points: 750 }, { position: 2, points: 400 }, { position: 3, points: 350 },
    { position: 4, points: 325 }, { position: 5, points: 300 }, { position: 6, points: 275 },
    { position: 7, points: 225 }, { position: 8, points: 200 }, { position: 9, points: 175 },
    { position: 10, points: 150 }, { position: 11, points: 130 }, { position: 12, points: 120 },
    { position: 13, points: 110 }, { position: 14, points: 90 }, { position: 15, points: 80 },
    { position: 16, points: 70 }, { position: 17, points: 65 }, { position: 18, points: 60 },
    { position: 19, points: 55 }, { position: 20, points: 50 }, { position: 21, points: 48 },
    { position: 22, points: 46 }, { position: 23, points: 44 }, { position: 24, points: 42 },
    { position: 25, points: 40 }, { position: 26, points: 38 }, { position: 27, points: 36 },
    { position: 28, points: 34 }, { position: 29, points: 32.5 }, { position: 30, points: 31 },
    { position: 31, points: 29.5 }, { position: 32, points: 28 }, { position: 33, points: 26.5 },
    { position: 34, points: 25 }, { position: 35, points: 24 }, { position: 36, points: 23 },
    { position: 37, points: 22 }, { position: 38, points: 21 }, { position: 39, points: 20.25 },
    { position: 40, points: 19.5 }, { position: 41, points: 18.75 }, { position: 42, points: 18 },
    { position: 43, points: 17.25 }, { position: 44, points: 16.5 }, { position: 45, points: 15.75 },
    { position: 46, points: 15 }, { position: 47, points: 14.25 }, { position: 48, points: 13.5 },
    { position: 49, points: 13 }, { position: 50, points: 12.5 }, { position: 51, points: 12 },
    { position: 52, points: 11.5 }, { position: 53, points: 11 }, { position: 54, points: 10.5 },
    { position: 55, points: 10 }, { position: 56, points: 9.5 }, { position: 57, points: 9 },
    { position: 58, points: 8.5 }, { position: 59, points: 8 }, { position: 60, points: 7.75 },
    { position: 61, points: 7.5 }, { position: 62, points: 7.25 }, { position: 63, points: 7 }
  ],
  tour: [
    // Values from Tour Points List PDF
    { position: 1, points: 500 }, { position: 2, points: 300 }, { position: 3, points: 190 },
    { position: 4, points: 135 }, { position: 5, points: 110 }, { position: 6, points: 100 },
    { position: 7, points: 90 }, { position: 8, points: 85 }, { position: 9, points: 80 },
    { position: 10, points: 75 }, { position: 11, points: 70 }, { position: 12, points: 65 },
    { position: 13, points: 60 }, { position: 14, points: 55 }, { position: 15, points: 53 },
    { position: 16, points: 51 }, { position: 17, points: 49 }, { position: 18, points: 47 },
    { position: 19, points: 45 }, { position: 20, points: 43 }, { position: 21, points: 41 },
    { position: 22, points: 39 }, { position: 23, points: 37 }, { position: 24, points: 35.5 },
    { position: 25, points: 34 }, { position: 26, points: 32.5 }, { position: 27, points: 31 },
    { position: 28, points: 29.5 }, { position: 29, points: 28 }, { position: 30, points: 26.5 },
    { position: 31, points: 25 }, { position: 32, points: 23.5 }, { position: 33, points: 22 },
    { position: 34, points: 21 }, { position: 35, points: 20 }, { position: 36, points: 19 },
    { position: 37, points: 18 }, { position: 38, points: 17 }, { position: 39, points: 16 },
    { position: 40, points: 15 }, { position: 41, points: 14 }, { position: 42, points: 13 },
    { position: 43, points: 12 }, { position: 44, points: 11 }, { position: 45, points: 10.5 },
    { position: 46, points: 10 }, { position: 47, points: 9.5 }, { position: 48, points: 9 },
    { position: 49, points: 8.5 }, { position: 50, points: 8 }, { position: 51, points: 7.5 },
    { position: 52, points: 7 }, { position: 53, points: 6.5 }, { position: 54, points: 6 },
    { position: 55, points: 5.8 }, { position: 56, points: 5.6 }, { position: 57, points: 5.4 },
    { position: 58, points: 5.2 }, { position: 59, points: 5 }, { position: 60, points: 4.8 },
    { position: 61, points: 4.6 }, { position: 62, points: 4.4 }, { position: 63, points: 4.2 },
    { position: 64, points: 4 }, { position: 65, points: 3.8 }
  ],
  league: [
    // Values from League Points List PDF
    { position: 1, points: 93.75 }, { position: 2, points: 50 }, { position: 3, points: 43.75 },
    { position: 4, points: 40.625 }, { position: 5, points: 37.5 }, { position: 6, points: 34.375 },
    { position: 7, points: 28.125 }, { position: 8, points: 25 }, { position: 9, points: 21.875 },
    { position: 10, points: 18.75 }, { position: 11, points: 16.25 }, { position: 12, points: 15 },
    { position: 13, points: 13.75 }, { position: 14, points: 11.25 }, { position: 15, points: 10 },
    { position: 16, points: 8.75 }, { position: 17, points: 8.125 }, { position: 18, points: 7.5 },
    { position: 19, points: 6.875 }, { position: 20, points: 6 }
  ],
  supr: [
    // Values from SUPR Club Points List PDF
    { position: 1, points: 93.75 }, { position: 2, points: 50 }, { position: 3, points: 43.75 },
    { position: 4, points: 40.625 }, { position: 5, points: 37.5 }, { position: 6, points: 34.375 },
    { position: 7, points: 28.125 }, { position: 8, points: 25 }, { position: 9, points: 21.875 },
    { position: 10, points: 18.75 }, { position: 11, points: 16.25 }, { position: 12, points: 15 },
    { position: 13, points: 13.75 }, { position: 14, points: 11.25 }, { position: 15, points: 10 },
    { position: 16, points: 8.75 }, { position: 17, points: 8.125 }, { position: 18, points: 7.5 },
    { position: 19, points: 6.875 }, { position: 20, points: 6 }
  ]
};

// Convert the default points config to the format expected by the schema
function formatPointsConfig() {
  const result: PointsConfig = {
    major: [],
    tour: [],
    league: [],
    supr: []
  };
  
  // Copy each tournament type's points data
  Object.keys(DEFAULT_POINTS_CONFIG).forEach(type => {
    result[type as keyof PointsConfig] = [...DEFAULT_POINTS_CONFIG[type as keyof typeof DEFAULT_POINTS_CONFIG]];
  });
  
  return result;
}

// Store the config in memory - can be upgraded to database storage later if needed
let pointsConfig: PointsConfig = formatPointsConfig();

// Default app settings
let appSettings: AppSettings = {
  appName: "Hideout Founders' Series 2025",
  pageTitle: "Overall Leaderboard",
  scoringType: "both",
  sidebarColor: "#0f172a",
  logoUrl: "/images/hideout-logo.png"
};

export class DatabaseStorage implements IStorage {
  private leaderboardCalculator: LeaderboardCalculator;

  constructor() {
    this.leaderboardCalculator = new LeaderboardCalculator(pointsConfig);
  }
  // League operations
  async getLeagues(): Promise<League[]> {
    return db.select().from(leagues).orderBy(leagues.name);
  }

  async getLeague(id: number): Promise<League | undefined> {
    const [league] = await db.select().from(leagues).where(eq(leagues.id, id));
    return league;
  }

  async createLeague(league: InsertLeague): Promise<League> {
    const [newLeague] = await db.insert(leagues).values(league).returning();
    return newLeague;
  }

  async updateLeague(id: number, leagueData: Partial<InsertLeague>): Promise<League | undefined> {
    const [updatedLeague] = await db
      .update(leagues)
      .set(leagueData)
      .where(eq(leagues.id, id))
      .returning();
    return updatedLeague;
  }

  async deleteLeague(id: number): Promise<boolean> {
    const result = await db.delete(leagues).where(eq(leagues.id, id));
    return result && result.rowCount ? result.rowCount > 0 : false;
  }

  async getTournamentsByLeague(leagueId: number): Promise<Tournament[]> {
    return db
      .select()
      .from(tournaments)
      .where(eq(tournaments.leagueId, leagueId))
      .orderBy(desc(tournaments.date));
  }
  
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

  async findPlayerByEmail(email: string): Promise<Player | undefined> {
    const [player] = await db.select()
      .from(players)
      .where(eq(players.email, email));
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
  
  async deletePlayer(id: number): Promise<boolean> {
    // Check if the player has any results
    const results = await this.getPlayerResultsByPlayer(id);
    if (results.length > 0) {
      // Don't delete players with results
      return false;
    }
    
    // Delete the player if they have no results
    const [deletedPlayer] = await db.delete(players)
      .where(eq(players.id, id))
      .returning();
    
    return !!deletedPlayer;
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
    return this.leaderboardCalculator.generateNetLeaderboard();
  }

  async getGrossLeaderboard(): Promise<PlayerWithHistory[]> {
    return this.leaderboardCalculator.generateGrossLeaderboard();
  }

  async getPlayerWithHistory(playerId: number): Promise<PlayerWithHistory | undefined> {
    return this.leaderboardCalculator.calculatePlayerHistory(playerId, 'net');
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
        grossPoints: null, // Added to satisfy schema
      });
    }
    
    return tournament;
  }

  // Helper methods - now handled by LeaderboardCalculator

  // Points configuration operations
  async getPointsConfig(): Promise<PointsConfig> {
    return pointsConfig;
  }

  async updatePointsConfig(config: PointsConfig): Promise<PointsConfig> {
    pointsConfig = { ...config };
    // Update the calculator with new points config
    this.leaderboardCalculator = new LeaderboardCalculator(pointsConfig);
    return pointsConfig;
  }

  // App settings methods
  async getAppSettings(): Promise<AppSettings> {
    return appSettings;
  }

  async updateAppSettings(settings: AppSettings): Promise<AppSettings> {
    appSettings = { ...settings };
    return appSettings;
  }

  // User operations for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userData.id))
      .limit(1);

    if (existingUser.length > 0) {
      // User exists - only update authentication-related fields, preserve custom profile data
      const [user] = await db
        .update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          role: userData.role,
          isActive: userData.isActive,
          updatedAt: new Date(),
          // Preserve existing displayName, homeClub, and friendsList if they exist
        })
        .where(eq(users.id, userData.id))
        .returning();
      return user;
    } else {
      // New user - insert with all provided data
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    }
  }

  async updateUserProfile(userId: string, profileData: UpdateUserProfile): Promise<User | undefined> {
    try {
      console.log("Updating user profile:", { userId, profileData });
      
      const [user] = await db
        .update(users)
        .set({
          displayName: profileData.displayName,
          homeClub: profileData.homeClub || null,
          friendsList: profileData.friendsList || [],
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
      
      console.log("Updated user:", user);
      return user;
    } catch (error) {
      console.error("Database error in updateUserProfile:", error);
      throw error;
    }
  }

  async getUserPlayerProfile(userId: string): Promise<{ user: User, player?: Player, linkedPlayerId?: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is linked to a player
    const [profile] = await db
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, userId));

    let player: Player | undefined;
    if (profile) {
      player = await this.getPlayer(profile.playerId!);
    } else if (user.email) {
      // Try automatic email matching if no manual link exists
      const autoLinkedPlayer = await this.findPlayerByEmail(user.email);
      if (autoLinkedPlayer) {
        // Automatically create the link
        await this.linkUserToPlayer(userId, autoLinkedPlayer.id);
        player = autoLinkedPlayer;
      }
    }

    return { 
      user, 
      player, 
      linkedPlayerId: profile?.playerId || player?.id
    };
  }

  async linkUserToPlayer(userId: string, playerId: number): Promise<PlayerProfile> {
    // Check if link already exists
    const [existing] = await db
      .select()
      .from(playerProfiles)
      .where(and(
        eq(playerProfiles.userId, userId),
        eq(playerProfiles.playerId, playerId)
      ));

    if (existing) {
      return existing;
    }

    const [link] = await db
      .insert(playerProfiles)
      .values({ userId, playerId })
      .returning();
    return link;
  }

  async unlinkUserFromPlayer(userId: string): Promise<boolean> {
    const result = await db
      .delete(playerProfiles)
      .where(eq(playerProfiles.userId, userId));
    return result && result.rowCount ? result.rowCount > 0 : false;
  }

  async updateUserRole(userId: string, role: 'player' | 'admin' | 'super_admin'): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        role, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Get leaderboard filtered by friends
  async getFriendsLeaderboard(userId: string, scoreType: 'net' | 'gross'): Promise<PlayerWithHistory[]> {
    const user = await this.getUser(userId);
    if (!user || !user.friendsList || user.friendsList.length === 0) {
      return [];
    }

    // Get full leaderboard first
    const allPlayers = scoreType === 'net' 
      ? await this.getNetLeaderboard()
      : await this.getGrossLeaderboard();

    // Filter by friends (assuming friend names match player names)
    return allPlayers.filter(player => 
      user.friendsList?.includes(player.player.name) || 
      player.player.name === user.displayName
    );
  }

  // Player link request methods
  async createPlayerLinkRequest(userId: string, playerId: number, requestMessage?: string): Promise<PlayerLinkRequest> {
    const [request] = await db
      .insert(playerLinkRequests)
      .values({ 
        userId, 
        playerId, 
        requestMessage 
      })
      .returning();
    return request;
  }

  async getPlayerLinkRequests(status?: 'pending' | 'approved' | 'rejected'): Promise<PlayerLinkRequest[]> {
    const query = db.select().from(playerLinkRequests);
    
    if (status) {
      query.where(eq(playerLinkRequests.status, status));
    }
    
    return query.orderBy(desc(playerLinkRequests.requestedAt));
  }

  async getUserPlayerLinkRequest(userId: string): Promise<PlayerLinkRequest | undefined> {
    const [request] = await db
      .select()
      .from(playerLinkRequests)
      .where(eq(playerLinkRequests.userId, userId))
      .orderBy(desc(playerLinkRequests.requestedAt));
    return request;
  }

  async approvePlayerLinkRequest(requestId: number, reviewedBy: string): Promise<PlayerLinkRequest | undefined> {
    // Get the request first
    const [request] = await db
      .select()
      .from(playerLinkRequests)
      .where(eq(playerLinkRequests.id, requestId));
    
    if (!request) return undefined;

    // Create the actual link
    await this.linkUserToPlayer(request.userId, request.playerId);
    
    // Update the request status
    const [updatedRequest] = await db
      .update(playerLinkRequests)
      .set({
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy
      })
      .where(eq(playerLinkRequests.id, requestId))
      .returning();
    
    return updatedRequest;
  }

  async rejectPlayerLinkRequest(requestId: number, reviewedBy: string, reviewMessage?: string): Promise<PlayerLinkRequest | undefined> {
    const [updatedRequest] = await db
      .update(playerLinkRequests)
      .set({
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy,
        reviewMessage
      })
      .where(eq(playerLinkRequests.id, requestId))
      .returning();
    
    return updatedRequest;
  }
}

export const storage = new DatabaseStorage();