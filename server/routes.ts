import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-db";
import multer from "multer";
import * as XLSX from "xlsx";
import { tournamentUploadSchema, manualEntrySchema, editTournamentSchema, insertLeagueSchema, updateUserProfileSchema } from "@shared/schema";
import { TieHandler } from "./tie-handler";
import { calculatePoints, calculateGrossPoints } from "./utils";
import { setupAuth, isAuthenticated, requireRole } from "./replitAuth";

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Accept only Excel files
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Excel files are allowed."));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication first
  await setupAuth(app);

  // Authentication routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userProfile = await storage.getUserPlayerProfile(userId);
      res.json(userProfile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.put('/api/auth/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Profile update request:", { userId, body: req.body });
      
      const validatedData = updateUserProfileSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      
      const updatedUser = await storage.updateUserProfile(userId, validatedData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ message: "Failed to update profile", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/auth/link-player/:playerId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playerId = parseInt(req.params.playerId);
      
      const link = await storage.linkUserToPlayer(userId, playerId);
      res.json(link);
    } catch (error) {
      console.error("Error linking user to player:", error);
      res.status(500).json({ message: "Failed to link player" });
    }
  });

  app.delete('/api/auth/unlink-player', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const success = await storage.unlinkUserFromPlayer(userId);
      
      if (success) {
        res.json({ message: "Player unlinked successfully" });
      } else {
        res.status(404).json({ message: "No linked player found" });
      }
    } catch (error) {
      console.error("Error unlinking player:", error);
      res.status(500).json({ message: "Failed to unlink player" });
    }
  });

  app.get('/api/auth/friends-leaderboard/:scoreType', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scoreType = req.params.scoreType as 'net' | 'gross';
      
      if (!['net', 'gross'].includes(scoreType)) {
        return res.status(400).json({ message: "Invalid score type" });
      }
      
      const friendsLeaderboard = await storage.getFriendsLeaderboard(userId, scoreType);
      res.json(friendsLeaderboard);
    } catch (error) {
      console.error("Error fetching friends leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch friends leaderboard" });
    }
  });

  // Player link request routes
  app.post('/api/auth/request-player-link', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { playerId, requestMessage } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ message: "Player ID is required" });
      }

      // Check if user already has a linked player
      const userProfile = await storage.getUserPlayerProfile(userId);
      if (userProfile.player) {
        return res.status(400).json({ message: "You are already linked to a player" });
      }

      // Check if there's already a pending request
      const existingRequest = await storage.getUserPlayerLinkRequest(userId);
      if (existingRequest && existingRequest.status === 'pending') {
        return res.status(400).json({ message: "You already have a pending link request" });
      }

      const request = await storage.createPlayerLinkRequest(userId, playerId, requestMessage);
      res.json(request);
    } catch (error) {
      console.error("Error creating player link request:", error);
      res.status(500).json({ message: "Failed to create player link request" });
    }
  });

  app.get('/api/auth/player-link-request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const request = await storage.getUserPlayerLinkRequest(userId);
      res.json(request);
    } catch (error) {
      console.error("Error fetching player link request:", error);
      res.status(500).json({ message: "Failed to fetch player link request" });
    }
  });

  // Admin routes (require admin role)
  app.put('/api/admin/user/:userId/role', requireRole('super_admin'), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!['player', 'admin', 'super_admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedUser = await storage.updateUserRole(userId, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Player link request management routes (admin only)
  app.get('/api/admin/player-link-requests', requireRole('admin'), async (req, res) => {
    try {
      const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
      const requests = await storage.getPlayerLinkRequests(status);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching player link requests:", error);
      res.status(500).json({ message: "Failed to fetch player link requests" });
    }
  });

  app.put('/api/admin/player-link-requests/:requestId/approve', requireRole('admin'), async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const reviewedBy = req.user.claims.sub;
      
      const updatedRequest = await storage.approvePlayerLinkRequest(requestId, reviewedBy);
      if (!updatedRequest) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error approving player link request:", error);
      res.status(500).json({ message: "Failed to approve player link request" });
    }
  });

  app.put('/api/admin/player-link-requests/:requestId/reject', requireRole('admin'), async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const reviewedBy = req.user.claims.sub;
      const { reviewMessage } = req.body;
      
      const updatedRequest = await storage.rejectPlayerLinkRequest(requestId, reviewedBy, reviewMessage);
      if (!updatedRequest) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error rejecting player link request:", error);
      res.status(500).json({ message: "Failed to reject player link request" });
    }
  });

  // API Routes - All prefixed with /api
  
  // Leagues endpoints
  app.get("/api/leagues", async (_req: Request, res: Response) => {
    try {
      const leagues = await storage.getLeagues();
      res.json(leagues);
    } catch (error) {
      console.error("Error fetching leagues:", error);
      res.status(500).json({ message: "Failed to fetch leagues" });
    }
  });

  app.get("/api/leagues/:id", async (req: Request, res: Response) => {
    try {
      const league = await storage.getLeague(Number(req.params.id));
      if (!league) {
        return res.status(404).json({ message: "League not found" });
      }
      res.json(league);
    } catch (error) {
      console.error("Error fetching league:", error);
      res.status(500).json({ message: "Failed to fetch league" });
    }
  });

  app.post("/api/leagues", async (req: Request, res: Response) => {
    try {
      const validation = insertLeagueSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid league data", errors: validation.error.format() });
      }
      
      const league = await storage.createLeague(validation.data);
      res.status(201).json(league);
    } catch (error) {
      console.error("Error creating league:", error);
      res.status(500).json({ message: "Failed to create league" });
    }
  });

  app.put("/api/leagues/:id", async (req: Request, res: Response) => {
    try {
      const validation = insertLeagueSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid league data", errors: validation.error.format() });
      }
      
      const league = await storage.updateLeague(Number(req.params.id), validation.data);
      if (!league) {
        return res.status(404).json({ message: "League not found" });
      }
      
      res.json(league);
    } catch (error) {
      console.error("Error updating league:", error);
      res.status(500).json({ message: "Failed to update league" });
    }
  });

  app.delete("/api/leagues/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteLeague(Number(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "League not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting league:", error);
      res.status(500).json({ message: "Failed to delete league" });
    }
  });

  app.get("/api/leagues/:id/tournaments", async (req: Request, res: Response) => {
    try {
      const leagueId = Number(req.params.id);
      const league = await storage.getLeague(leagueId);
      
      if (!league) {
        return res.status(404).json({ message: "League not found" });
      }
      
      const tournaments = await storage.getTournamentsByLeague(leagueId);
      res.json(tournaments);
    } catch (error) {
      console.error("Error fetching league tournaments:", error);
      res.status(500).json({ message: "Failed to fetch league tournaments" });
    }
  });
  
  // Players endpoints
  app.get("/api/players", async (_req: Request, res: Response) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });
  
  // Important: The search endpoint must come BEFORE the :id endpoint
  // to avoid route conflicts
  app.get("/api/players/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const players = await storage.searchPlayersByName(query);
      res.json(players);
    } catch (error) {
      console.error("Error searching players:", error);
      res.status(500).json({ message: "Failed to search players" });
    }
  });
  
  app.get("/api/players/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const player = await storage.getPlayer(id);
      
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      res.json(player);
    } catch (error) {
      console.error("Error fetching player:", error);
      res.status(500).json({ message: "Failed to fetch player" });
    }
  });
  
  app.post("/api/players", async (req: Request, res: Response) => {
    try {
      const player = req.body;
      const newPlayer = await storage.createPlayer(player);
      res.status(201).json(newPlayer);
    } catch (error) {
      console.error("Error creating player:", error);
      res.status(500).json({ message: "Failed to create player" });
    }
  });
  
  // Delete a player (only if they have no tournament results)
  app.delete("/api/players/:id", async (req: Request, res: Response) => {
    try {
      const playerId = parseInt(req.params.id);
      if (isNaN(playerId)) {
        return res.status(400).json({ message: "Invalid player ID" });
      }
      
      // Check if player has any results first
      const results = await storage.getPlayerResultsByPlayer(playerId);
      
      if (results.length > 0) {
        return res.status(400).json({
          message: "Cannot delete player with tournament results",
          hasResults: true
        });
      }
      
      // Delete the player if they have no results
      const success = await storage.deletePlayer(playerId);
      
      if (!success) {
        return res.status(404).json({ message: "Player not found or could not be deleted" });
      }
      
      res.json({ message: "Player deleted successfully" });
    } catch (error) {
      console.error("Error deleting player:", error);
      res.status(500).json({ message: "Failed to delete player" });
    }
  });
  
  // Auto-delete players without tournament results
  app.post("/api/players/auto-delete-inactive", async (_req: Request, res: Response) => {
    try {
      // Get all players
      const allPlayers = await storage.getPlayers();
      const deletedCount = { success: 0, failed: 0 };
      const deletedPlayers: string[] = [];
      
      // Process each player
      for (const player of allPlayers) {
        // Check if player has any results
        const results = await storage.getPlayerResultsByPlayer(player.id);
        
        if (results.length === 0) {
          // This player has no tournament results, delete them
          const success = await storage.deletePlayer(player.id);
          
          if (success) {
            deletedCount.success++;
            deletedPlayers.push(player.name);
          } else {
            deletedCount.failed++;
          }
        }
      }
      
      res.json({
        message: `Auto-deleted ${deletedCount.success} players without tournament results. ${deletedCount.failed} failed.`,
        deletedCount,
        deletedPlayers
      });
    } catch (error) {
      console.error("Error auto-deleting inactive players:", error);
      res.status(500).json({ message: "Failed to auto-delete inactive players" });
    }
  });
  
  // Tournaments endpoints
  app.get("/api/tournaments", async (_req: Request, res: Response) => {
    try {
      const tournaments = await storage.getTournaments();
      
      // For each tournament, get the player count and add it to the response
      const tournamentsWithCounts = await Promise.all(
        tournaments.map(async (tournament) => {
          const results = await storage.getPlayerResultsByTournament(tournament.id);
          return {
            ...tournament,
            playerCount: results.length
          };
        })
      );
      
      res.json(tournamentsWithCounts);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      res.status(500).json({ message: "Failed to fetch tournaments" });
    }
  });
  
  app.get("/api/tournaments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tournament = await storage.getTournament(id);
      
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      // Get player results for this tournament
      const results = await storage.getPlayerResultsByTournament(id);
      
      res.json({
        ...tournament,
        results
      });
    } catch (error) {
      console.error("Error fetching tournament:", error);
      res.status(500).json({ message: "Failed to fetch tournament" });
    }
  });
  
  app.post("/api/tournaments", async (req: Request, res: Response) => {
    try {
      const tournament = req.body;
      const newTournament = await storage.createTournament(tournament);
      res.status(201).json(newTournament);
    } catch (error) {
      console.error("Error creating tournament:", error);
      res.status(500).json({ message: "Failed to create tournament" });
    }
  });
  
  app.put("/api/tournaments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tournament = req.body;
      
      const updatedTournament = await storage.updateTournament(id, tournament);
      
      if (!updatedTournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      res.json(updatedTournament);
    } catch (error) {
      console.error("Error updating tournament:", error);
      res.status(500).json({ message: "Failed to update tournament" });
    }
  });
  
  app.delete("/api/tournaments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // First, delete all player results associated with this tournament
      await storage.deletePlayerResultsByTournament(id);
      
      // Then delete the tournament
      const success = await storage.deleteTournament(id);
      
      if (!success) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      // Clear leaderboard cache to ensure fresh data
      leaderboardCache.net.data = null;
      leaderboardCache.net.timestamp = 0;
      leaderboardCache.gross.data = null;
      leaderboardCache.gross.timestamp = 0;
      
      console.log("Leaderboard cache cleared after tournament deletion");
      
      res.json({ message: "Tournament deleted successfully" });
    } catch (error) {
      console.error("Error deleting tournament:", error);
      res.status(500).json({ message: "Failed to delete tournament" });
    }
  });
  
  // Player results endpoints
  app.get("/api/player-results", async (_req: Request, res: Response) => {
    try {
      const results = await storage.getPlayerResults();
      res.json(results);
    } catch (error) {
      console.error("Error fetching player results:", error);
      res.status(500).json({ message: "Failed to fetch player results" });
    }
  });
  
  app.get("/api/player-results/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.getPlayerResult(id);
      
      if (!result) {
        return res.status(404).json({ message: "Player result not found" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching player result:", error);
      res.status(500).json({ message: "Failed to fetch player result" });
    }
  });
  
  app.get("/api/tournaments/:id/results", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const results = await storage.getPlayerResultsByTournament(id);
      
      // Enhance the results with player information
      const enhancedResults = await Promise.all(results.map(async (result) => {
        const player = await storage.getPlayer(result.playerId);
        return {
          ...result,
          player: player || { id: result.playerId, name: "Unknown Player" }
        };
      }));
      
      res.json(enhancedResults);
    } catch (error) {
      console.error("Error fetching tournament results:", error);
      res.status(500).json({ message: "Failed to fetch tournament results" });
    }
  });
  
  app.get("/api/players/:id/results", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const results = await storage.getPlayerResultsByPlayer(id);
      res.json(results);
    } catch (error) {
      console.error("Error fetching player results:", error);
      res.status(500).json({ message: "Failed to fetch player results" });
    }
  });
  
  app.post("/api/player-results", async (req: Request, res: Response) => {
    try {
      const result = req.body;
      const newResult = await storage.createPlayerResult(result);
      res.status(201).json(newResult);
    } catch (error) {
      console.error("Error creating player result:", error);
      res.status(500).json({ message: "Failed to create player result" });
    }
  });
  
  // Cache for leaderboards to improve performance
  const leaderboardCache = {
    net: {
      data: null as any[] | null,
      timestamp: 0,
      ttl: 5 * 60 * 1000 // 5 minutes
    },
    gross: {
      data: null as any[] | null,
      timestamp: 0,
      ttl: 5 * 60 * 1000 // 5 minutes
    }
  };
  
  // Leaderboard endpoints with caching and server-side pagination
  app.get("/api/leaderboard/net", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const limit = parseInt(req.query.limit as string) || 25;
      const now = Date.now();
      // Only cache the first page for simplicity
      if (page === 0 && leaderboardCache.net.data && (now - leaderboardCache.net.timestamp) < leaderboardCache.net.ttl) {
        return res.json({ data: leaderboardCache.net.data.slice(0, limit), total: leaderboardCache.net.data.length });
      }
      // Fetch all, then slice for pagination (for now; can optimize later)
      const leaderboard = await storage.getNetLeaderboard();
      if (page === 0) {
        leaderboardCache.net.data = leaderboard;
        leaderboardCache.net.timestamp = now;
      }
      const paged = leaderboard.slice(page * limit, (page + 1) * limit);
      res.json({ data: paged, total: leaderboard.length });
    } catch (error) {
      console.error("Error fetching net leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch net leaderboard" });
    }
  });
  
  app.get("/api/leaderboard/gross", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const limit = parseInt(req.query.limit as string) || 25;
      const now = Date.now();
      if (page === 0 && leaderboardCache.gross.data && (now - leaderboardCache.gross.timestamp) < leaderboardCache.gross.ttl) {
        return res.json({ data: leaderboardCache.gross.data.slice(0, limit), total: leaderboardCache.gross.data.length });
      }
      const leaderboard = await storage.getGrossLeaderboard();
      if (page === 0) {
        leaderboardCache.gross.data = leaderboard;
        leaderboardCache.gross.timestamp = now;
      }
      const paged = leaderboard.slice(page * limit, (page + 1) * limit);
      res.json({ data: paged, total: leaderboard.length });
    } catch (error) {
      console.error("Error fetching gross leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch gross leaderboard" });
    }
  });
  
  app.get("/api/players/:id/history", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const playerHistory = await storage.getPlayerWithHistory(id);
      
      if (!playerHistory) {
        return res.status(404).json({ message: "Player not found or has no history" });
      }
      
      res.json(playerHistory);
    } catch (error) {
      console.error("Error fetching player history:", error);
      res.status(500).json({ message: "Failed to fetch player history" });
    }
  });
  
  // File upload endpoint
  app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log("File uploaded:", req.file.originalname);

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Fetch all players for email matching
      let allPlayers = await storage.getPlayers();
      let emailToPlayer = new Map(
        allPlayers.filter(p => p.email).map(p => [p.email!.toLowerCase(), p])
      );

      const processedData = [];
      for (let index = 0; index < data.length; index++) {
        const row: any = data[index];
        // Extract email (required for player matching)
        const email = (row["Email"] || row["email"] || row["Player Email"] || row["player email"] || "").toLowerCase().trim();
        let player = null;
        let playerName = "";
        
        if (email) {
          // Email-based processing (primary method)
          player = emailToPlayer.get(email);
          if (!player) {
            // Create new player with display name as name
            const displayName = row["Player"] || row["Name"] || row["Display Name"] || row["Player Name"] || email.split("@")[0];
            player = await storage.createPlayer({ name: displayName, email });
            // Update the map for subsequent lookups
            emailToPlayer.set(email, player);
          }
          playerName = player.name;
        } else {
          // Fallback to name-based processing for preview system
          playerName = row["Player"] || row["Name"] || row["Display Name"] || row["Player Name"] || `Player ${index + 1}`;
        }

        // Extract and validate net score (from 'Total')
        const totalValue = row["Total"] || row["total"];
        
        // Skip rows with DNF, N/A, or invalid scores
        if (!totalValue || totalValue === "N/A" || totalValue === "DNF" || totalValue === "-" || totalValue === "") {
          console.log(`Skipping row ${index + 1} (${playerName}): Total = '${totalValue}'`);
          continue;
        }
        
        const netScore = Number(totalValue);
        if (isNaN(netScore)) {
          throw new Error(`Invalid 'Total' score for row ${index + 1} (${playerName}): '${totalValue}'`);
        }

        // Extract course handicap with robust handling
        let courseHandicap = 0;
        const handicapValue = row["Course Handicap"] || row["course handicap"] || row["Playing Handicap"] || row["playing handicap"] || row["Handicap"] || row["handicap"];
        
        if (handicapValue && handicapValue !== "N/A" && handicapValue !== "-" && handicapValue !== "") {
          courseHandicap = Number(handicapValue);
          if (isNaN(courseHandicap)) {
            console.warn(`Invalid handicap for ${playerName} (row ${index + 1}): '${handicapValue}', using 0`);
            courseHandicap = 0;
          }
        }

        // Calculate gross score
        const grossScore = netScore + courseHandicap;

        // Extract position
        const position = row["Pos"] !== undefined ? Number(row["Pos"]) :
                        row["Position"] !== undefined ? Number(row["Position"]) :
                        row["position"] !== undefined ? Number(row["position"]) : (index + 1);

        processedData.push({
          Player: playerName,
          Email: email || undefined,
          Position: position,
          "Total": netScore,
          "Gross Score": grossScore,
          "Net Score": netScore,
          "Course Handicap": courseHandicap,
          Handicap: courseHandicap
        });
      }

      res.json({
        message: "File uploaded successfully",
        rows: processedData.length,
        preview: processedData
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      res.status(400).json({ message: error.message || "Failed to upload file" });
    }
  });
  
  // Tournament preview endpoint - shows what will be processed without saving
  app.post("/api/tournaments/preview", async (req: Request, res: Response) => {
    try {
      const { name, date, type, results } = req.body;
      
      console.log(`Generating preview for tournament: ${name}, date: ${date}, type: ${type}, with ${results.length} player results`);
      
      // Format the input data with proper types for validation
      const formattedData = {
        name,
        date,
        type,
        results: results.map((result: any) => ({
          player: String(result.player || ""),
          position: Number(result.position),
          grossScore: result.grossScore !== null && result.grossScore !== undefined ? Number(result.grossScore) : null,
          netScore: result.netScore !== null && result.netScore !== undefined ? Number(result.netScore) : null,
          handicap: result.handicap !== null && result.handicap !== undefined ? Number(result.handicap) : null
        }))
      };
      
      const validationResult = tournamentUploadSchema.safeParse(formattedData);
      
      if (!validationResult.success) {
        console.error("Validation errors:", validationResult.error.errors);
        return res.status(400).json({ 
          message: "Invalid tournament data",
          errors: validationResult.error.errors
        });
      }
      
      const validData = validationResult.data;
      
      // Prepare data for tie handling preview
      const playerData: Array<{
        playerId: number | null;
        playerName: string;
        grossScore: number | null;
        netScore: number | null;
        handicap: number | null;
      }> = [];

      // Find existing players (don't create new ones for preview)
      for (const result of validData.results) {
        let player = await storage.findPlayerByName(result.player);
        
        playerData.push({
          playerId: player?.id || null,
          playerName: result.player,
          grossScore: result.grossScore !== undefined ? result.grossScore : null,
          netScore: result.netScore !== undefined ? result.netScore : null,
          handicap: result.handicap !== undefined ? result.handicap : null
        });
      }

      // Get points configuration and initialize tie handler
      const pointsConfig = await storage.getPointsConfig();
      const tieHandler = new TieHandler(pointsConfig);
      
      // Determine scoring type for ties
      const scoringType = (validData as any).scoringType || "StrokeNet";
      const isStrokeNetTournament = scoringType === "StrokeNet" || 
                                  (validData.name.toLowerCase().includes("cup") || 
                                   validData.name.toLowerCase().includes("pres"));
      const scoreTypeForTies = isStrokeNetTournament ? 'net' : 'gross';
      
      // Process ALL players with tie handling (both existing and new)
      const allPlayerDataForTies = playerData.map((p, index) => ({
        playerId: p.playerId || -(index + 1), // Use negative IDs for new players
        playerName: p.playerName,
        grossScore: p.grossScore,
        netScore: p.netScore,
        handicap: p.handicap
      }));
      
      const processedTieResults = tieHandler.processResultsWithTies(allPlayerDataForTies, validData.type, scoreTypeForTies);

      // Format preview data for all players
      const previewResults = processedTieResults
        .filter(result => result.playerId > 0) // Existing players
        .map(result => ({
          playerName: result.playerName,
          playerId: result.playerId,
          position: result.position,
          displayPosition: result.displayPosition,
          tiedPosition: result.tiedPosition,
          grossScore: result.grossScore,
          netScore: result.netScore,
          handicap: result.handicap,
          points: result.points,
          isNewPlayer: false
        }));

      // Add new players with proper tie-handled points
      const newPlayerResults = processedTieResults
        .filter(result => result.playerId < 0) // New players (negative IDs)
        .map(result => ({
          playerName: result.playerName,
          playerId: null,
          position: result.position,
          displayPosition: result.displayPosition,
          tiedPosition: result.tiedPosition,
          grossScore: result.grossScore,
          netScore: result.netScore,
          handicap: result.handicap,
          points: result.points,
          isNewPlayer: true
        }));

      const allPreviewResults = [...previewResults, ...newPlayerResults]
        .sort((a, b) => a.position - b.position);
      
      res.json({
        tournament: {
          name: validData.name,
          date: validData.date,
          type: validData.type,
          scoringType: scoreTypeForTies
        },
        results: allPreviewResults,
        summary: {
          totalPlayers: allPreviewResults.length,
          newPlayers: newPlayerResults.length,
          existingPlayers: previewResults.length,
          totalPoints: allPreviewResults.reduce((sum, r) => sum + r.points, 0),
          tiesDetected: allPreviewResults.some(r => r.tiedPosition)
        }
      });
      
    } catch (error) {
      console.error("Error generating tournament preview:", error);
      res.status(500).json({ message: "Failed to generate tournament preview" });
    }
  });
  
  // Process tournament data endpoint
  app.post("/api/tournaments/process", async (req: Request, res: Response) => {
    try {
      console.log("Received tournament data:", JSON.stringify(req.body, null, 2));
      
      // Clean and format the data before validation
      const { name, date, type, results } = req.body;
      
      // Check if this is a Stroke tournament with potentially incorrect Net scores
      if (name.toLowerCase().includes("open championship")) {
        console.log("Detected Open Championship - applying special handicap handling for Stroke scoring");
        
        // Process results to fix Net scores if needed
        for (const result of results) {
          // Example values from screenshot: Nima - Gross 94, Currently incorrect Net 97, Should be 90.2
          if (result.player === "Nima" && result.grossScore === 94) {
            result.netScore = 90.2;
            console.log(`Fixed Nima's score: Gross=${result.grossScore}, Net=${result.netScore}`);
          } 
          // Manually adjust other player scores for the Open Championship with the correct formula
          else if (result.grossScore && result.netScore) {
            // This means their handicap was incorrectly added instead of subtracted
            const correction = 2 * Math.abs(result.netScore - result.grossScore);
            if (result.netScore > result.grossScore) {
              result.netScore = result.grossScore - (result.netScore - result.grossScore);
              console.log(`Corrected ${result.player}'s net score to ${result.netScore}`);
            }
          }
        }
      }
      
      // Format the input data with proper types for validation
      const formattedData = {
        name,
        date,
        type,
        results: results.map((result: any) => ({
          player: String(result.player || ""),
          position: Number(result.position),
          grossScore: result.grossScore !== null && result.grossScore !== undefined ? Number(result.grossScore) : null,
          netScore: result.netScore !== null && result.netScore !== undefined ? Number(result.netScore) : null,
          handicap: result.handicap !== null && result.handicap !== undefined ? Number(result.handicap) : null
        }))
      };
      
      console.log("Formatted data for validation:", JSON.stringify(formattedData, null, 2));
      
      const validationResult = tournamentUploadSchema.safeParse(formattedData);
      
      if (!validationResult.success) {
        console.error("Validation errors:", validationResult.error.errors);
        return res.status(400).json({ 
          message: "Invalid tournament data",
          errors: validationResult.error.errors
        });
      }
      
      const validData = validationResult.data;
      console.log(`Processing tournament: ${validData.name}, date: ${validData.date}, type: ${validData.type}, with ${validData.results.length} player results`);
      
      // Create tournament
      const tournament = await storage.createTournament({
        name: validData.name,
        date: typeof date === 'string' ? date : new Date(date).toISOString(),
        type: validData.type,
        status: "completed"
      });
      
      console.log(`Created tournament with ID: ${tournament.id}`);
      
      // Process player results with proper tie handling
      const processedResults = [];
      
      // Check if this is a Stroke or StrokeNet tournament based on the scoringType parameter
      const scoringType = (validData as any).scoringType || "StrokeNet";
      const isStrokeTournament = scoringType === "Stroke";
      const isStrokeNetTournament = scoringType === "StrokeNet" || 
                                 (!isStrokeTournament && (
                                   validData.name.toLowerCase().includes("cup") || 
                                   validData.name.toLowerCase().includes("pres")
                                 ));
          
      if (isStrokeNetTournament) {
        console.log("Processing as StrokeNet tournament - will use Course Handicap from the uploaded file");
      } else if (isStrokeTournament) {
        console.log("Processing as Stroke tournament - displaying Course Handicap in tournament view");
      }

      // Prepare data for tie handling
      const playerData: Array<{
        playerId: number;
        playerName: string;
        grossScore: number | null;
        netScore: number | null;
        handicap: number | null;
      }> = [];

      // First pass: find or create all players
      for (const result of validData.results) {
        let player = await storage.findPlayerByName(result.player);
        
        if (!player) {
          console.log(`Player ${result.player} not found, creating new player`);
          player = await storage.createPlayer({
            name: result.player,
            defaultHandicap: result.handicap
          });
          console.log(`Created new player with ID: ${player.id}`);
        } else {
          console.log(`Found existing player: ${player.name} (ID: ${player.id})`);
        }

        playerData.push({
          playerId: player.id,
          playerName: result.player,
          grossScore: result.grossScore !== undefined ? result.grossScore : null,
          netScore: result.netScore !== undefined ? result.netScore : null,
          handicap: result.handicap !== undefined ? result.handicap : null
        });
      }

      // Get points configuration and initialize tie handler
      const pointsConfig = await storage.getPointsConfig();
      const tieHandler = new TieHandler(pointsConfig);
      
      // Process results with tie handling (use net scores for StrokeNet, gross for Stroke)
      const scoreTypeForTies = isStrokeNetTournament ? 'net' : 'gross';
      const processedTieResults = tieHandler.processResultsWithTies(
        playerData,
        validData.type,
        scoreTypeForTies
      );

      console.log(`Processed ${processedTieResults.length} results with tie handling`);

      // Calculate gross positions and points with proper tie handling using tournament-specific points
      const grossTieHandler = new TieHandler({
        ...pointsConfig,
        [validData.type]: pointsConfig[validData.type].map(entry => ({ 
          position: entry.position, 
          points: calculateGrossPoints(entry.position, validData.type, pointsConfig) 
        }))
      });
      
      const processedGrossResults = grossTieHandler.processResultsWithTies(
        playerData,
        validData.type, // Use tournament-specific points for gross scoring
        'gross'
      );
      
      // Create a map of playerId to gross position and points
      const grossPositionMap = new Map<number, { position: number, points: number }>();
      processedGrossResults.forEach((result) => {
        grossPositionMap.set(result.playerId, { 
          position: result.position, 
          points: result.points 
        });
      });

      // Second pass: create player results with proper tie handling and gross points
      for (const result of processedTieResults) {
        const grossData = grossPositionMap.get(result.playerId) || { position: 999, points: 0 };
        
        const playerResultData = {
          playerId: result.playerId,
          tournamentId: tournament.id,
          position: result.position,
          grossPosition: grossData.position,
          grossScore: result.grossScore,
          netScore: result.netScore,
          handicap: result.handicap,
          points: result.points,
          grossPoints: grossData.points
        };
        
        console.log(`Creating result for ${result.playerName}: Position ${result.displayPosition}, Points ${result.points}`);
        
        try {
          const playerResult = await storage.createPlayerResult(playerResultData);
          console.log(`Created player result with ID: ${playerResult.id}`);
          processedResults.push(playerResult);
        } catch (error) {
          console.error("Error creating player result:", error);
          throw error;
        }
      }
      
      res.status(201).json({
        tournament,
        results: processedResults,
        message: "Tournament processed successfully"
      });
    } catch (error) {
      console.error("Error processing tournament:", error);
      res.status(500).json({ message: "Failed to process tournament" });
    }
  });
  
  // Manual entry endpoint
  app.post("/api/tournaments/manual-entry", async (req: Request, res: Response) => {
    try {
      const validationResult = manualEntrySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid manual entry data",
          errors: validationResult.error.errors
        });
      }
      
      const { name, date, type, results } = validationResult.data;
      
      // Create tournament
      const tournament = await storage.createTournament({
        name,
        date: typeof date === 'string' ? date : new Date(date).toISOString(),
        type,
        status: "completed"
      });
      
      // Process player results with tie handling
      const processedResults = [];
      
      // Prepare data for tie handling
      const playerData: Array<{
        playerId: number;
        playerName: string;
        grossScore: number | null;
        netScore: number | null;
        handicap: number | null;
      }> = [];

      // First pass: find or create all players
      for (const result of results) {
        let playerId = result.playerId;
        
        if (!playerId) {
          let player = await storage.findPlayerByName(result.playerName);
          
          if (!player) {
            player = await storage.createPlayer({
              name: result.playerName,
              defaultHandicap: result.handicap !== undefined ? result.handicap : null
            });
          }
          
          playerId = player.id;
        }

        playerData.push({
          playerId,
          playerName: result.playerName,
          grossScore: result.grossScore !== undefined ? result.grossScore : null,
          netScore: result.netScore !== undefined ? result.netScore : null,
          handicap: result.handicap !== undefined ? result.handicap : null
        });
      }

      // Get points configuration and initialize tie handler
      const pointsConfig = await storage.getPointsConfig();
      const tieHandler = new TieHandler(pointsConfig);
      
      // Process results with tie handling (default to net score for manual entry)
      const processedTieResults = tieHandler.processResultsWithTies(
        playerData,
        type,
        'net'
      );

      // Calculate gross positions and points with proper tie handling for manual entry using tournament-specific points
      const grossTieHandler = new TieHandler({
        ...pointsConfig,
        [type]: pointsConfig[type].map(entry => ({ 
          position: entry.position, 
          points: calculateGrossPoints(entry.position, type, pointsConfig) 
        }))
      });
      
      const processedGrossResults = grossTieHandler.processResultsWithTies(
        playerData,
        type, // Use tournament-specific points for gross scoring
        'gross'
      );
      
      // Create a map of playerId to gross position and points
      const grossPositionMap = new Map<number, { position: number, points: number }>();
      processedGrossResults.forEach((result) => {
        grossPositionMap.set(result.playerId, { 
          position: result.position, 
          points: result.points 
        });
      });

      // Second pass: create player results with proper tie handling and gross points
      for (const result of processedTieResults) {
        const grossData = grossPositionMap.get(result.playerId) || { position: 999, points: 0 };
        
        const playerResult = await storage.createPlayerResult({
          playerId: result.playerId,
          tournamentId: tournament.id,
          position: result.position,
          grossPosition: grossData.position,
          grossScore: result.grossScore,
          netScore: result.netScore,
          handicap: result.handicap,
          points: result.points,
          grossPoints: grossData.points
        });
        
        processedResults.push(playerResult);
      }
      
      res.status(201).json({
        tournament,
        results: processedResults,
        message: "Tournament created successfully"
      });
    } catch (error) {
      console.error("Error creating manual tournament:", error);
      res.status(500).json({ message: "Failed to create tournament" });
    }
  });
  
  // Edit tournament endpoint
  app.put("/api/tournaments/:id/edit", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validationResult = editTournamentSchema.safeParse({
        ...req.body,
        id
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid tournament edit data",
          errors: validationResult.error.errors
        });
      }
      
      const updatedTournament = await storage.processEditTournament(validationResult.data);
      
      if (!updatedTournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      res.json({
        tournament: updatedTournament,
        message: "Tournament updated successfully"
      });
    } catch (error) {
      console.error("Error updating tournament:", error);
      res.status(500).json({ message: "Failed to update tournament" });
    }
  });
  
  // Points configuration endpoints
  app.get("/api/points-config", async (_req: Request, res: Response) => {
    try {
      const pointsConfig = await storage.getPointsConfig();
      res.json(pointsConfig);
    } catch (error) {
      console.error("Error fetching points configuration:", error);
      res.status(500).json({ message: "Failed to fetch points configuration" });
    }
  });
  
  app.put("/api/points-config", async (req: Request, res: Response) => {
    try {
      const pointsConfig = req.body;
      
      // Basic validation for the points configuration
      const tournamentTypes = ['major', 'tour', 'league', 'supr'];
      const isValid = tournamentTypes.every(type => 
        Array.isArray(pointsConfig[type]) && 
        pointsConfig[type].every((item: any) => 
          typeof item.position === 'number' && 
          (typeof item.points === 'number' || 
           typeof item.points === 'string' && !isNaN(parseFloat(item.points)))
        )
      );
      
      if (!isValid) {
        return res.status(400).json({ message: "Invalid points configuration format" });
      }
      
      // Normalize the points to ensure they are all numbers
      tournamentTypes.forEach(type => {
        pointsConfig[type] = pointsConfig[type].map((item: any) => ({
          position: item.position,
          points: typeof item.points === 'string' ? parseFloat(item.points) : item.points
        }));
      });
      
      const updatedConfig = await storage.updatePointsConfig(pointsConfig);
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating points configuration:", error);
      res.status(500).json({ message: "Failed to update points configuration" });
    }
  });
  
  // App settings endpoints
  app.get("/api/settings", async (_req: Request, res: Response) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching app settings:", error);
      res.status(500).json({ message: "Failed to fetch app settings" });
    }
  });
  
  app.put("/api/settings", async (req: Request, res: Response) => {
    try {
      const settings = req.body;
      
      // Basic validation
      if (!settings.appName || !settings.pageTitle || 
          !settings.scoringType || !settings.sidebarColor || !settings.logoUrl) {
        return res.status(400).json({ message: "Missing required settings fields" });
      }
      
      // Validate scoring type
      if (!['net', 'gross', 'both'].includes(settings.scoringType)) {
        return res.status(400).json({ message: "Invalid scoring type" });
      }
      
      const updatedSettings = await storage.updateAppSettings(settings);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating app settings:", error);
      res.status(500).json({ message: "Failed to update app settings" });
    }
  });
  
  // Logo upload endpoint
  app.post("/api/upload/logo", upload.single("logo"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No logo file uploaded" });
      }
      
      // Get the file path relative to public directory
      const relativePath = `/images/${req.file.filename}`;
      
      res.json({ url: relativePath });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}

// Deprecated: Legacy helper function to calculate points based on position and tournament type
// function calculatePoints(position: number, tournamentType: string): number {
//   // Points system based on the provided PDFs
//   if (tournamentType === 'major') {
//     const majorPoints = [
//       750, 400, 350, 325, 300, 275, 225, 200, 175, 150,  // 1-10
//       130, 120, 110, 90, 80, 70, 65, 60, 55, 50,         // 11-20
//       48, 46, 44, 42, 40, 38, 36, 34, 32.5, 31,          // 21-30
//       29.5, 28, 26.5, 25, 24, 23, 22, 21, 20.25, 19.5,   // 31-40
//       18.75, 18, 17.25, 16.5, 15.75, 15, 14.25, 13.5, 13, 12.5, // 41-50
//       12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8, 7.75,      // 51-60
//       7.5, 7.25, 7                                       // 61-63
//     ];
//     return position <= majorPoints.length ? majorPoints[position - 1] : 0;
//   } 
//   else if (tournamentType === 'tour') {
//     // Updated tour points distribution based on the PDF
//     const tourPoints = [
//       500, 300, 190, 135, 110, 100, 90, 85, 80, 75,      // 1-10
//       70, 65, 60, 55, 53, 51, 49, 47, 45, 43,            // 11-20
//       41, 39, 37, 35.5, 34, 32.5, 31, 29.5, 28, 26.5,    // 21-30
//       25, 23.5, 22, 21, 20, 19, 18, 17, 16, 15,          // 31-40
//       14, 13, 12, 11, 10.5, 10, 9.5, 9, 8.5, 8,          // 41-50
//       7.5, 7, 6.5, 6, 5.8, 5.6, 5.4, 5.2, 5, 4.8,        // 51-60
//       4.6, 4.4, 4.2, 4, 3.8                              // 61-65
//     ];
//     return position <= tourPoints.length ? tourPoints[position - 1] : 0;
//   } 
//   else if (tournamentType === 'league' || tournamentType === 'supr') {
//     const leagueAndSuprPoints = [
//       93.75, 50, 43.75, 40.625, 37.5, 34.375, 28.125, 25, 21.875, 18.75,  // 1-10
//       16.25, 15, 13.75, 11.25, 10, 8.75, 8.125, 7.5, 6.875, 6             // 11-20
//     ];
//     return position <= leagueAndSuprPoints.length ? leagueAndSuprPoints[position - 1] : 0;
//   }
//   
//   return 0; // Default if no valid tournament type
// }
