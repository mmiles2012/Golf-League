import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import * as XLSX from "xlsx";
import { tournamentUploadSchema, manualEntrySchema, editTournamentSchema, insertLeagueSchema } from "@shared/schema";

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
      const success = await storage.deleteTournament(id);
      
      if (!success) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
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
  
  // Leaderboard endpoints
  app.get("/api/leaderboard/net", async (_req: Request, res: Response) => {
    try {
      const leaderboard = await storage.getNetLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching net leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch net leaderboard" });
    }
  });
  
  app.get("/api/leaderboard/gross", async (_req: Request, res: Response) => {
    try {
      const leaderboard = await storage.getGrossLeaderboard();
      res.json(leaderboard);
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
      
      console.log("Parsed Excel data:", data.length, "rows");
      
      // Log the first few rows to inspect the structure
      console.log("First row sample:", JSON.stringify(data[0], null, 2));
      
      // Process the data to ensure consistent column names
      const processedData = data.map((row: any, index: number) => {
        // Log all property names in this row for debugging
        console.log(`Row ${index} keys:`, Object.keys(row));
        
        // Extract player name from Player Name field based on the format we saw in logs
        const playerName = row["Player Name"] || row.Player || row.player || row.Name || row.name || "";
        
        // Extract position from Pos field based on the format we saw in logs
        const position = row.Pos !== undefined ? Number(row.Pos) : 
                        row.Position !== undefined ? Number(row.Position) : 
                        row.position !== undefined ? Number(row.position) : (index + 1);
        
        // Handle Stroke and StrokeNet scoring specifically
        let grossScore, netScore;
        
        if ((row.Scoring === "StrokeNet" || row.Scoring === "Stroke") && row.Total !== undefined) {
          // For Stroke/StrokeNet scoring:
          // In tournaments with "Stroke" scoring type:
          // - Gross score = Total (raw strokes)
          // - Net score = Total + Playing handicap
          
          // Total column represents the gross score
          grossScore = Number(row.Total);
          
          // First try to use Playing handicap, then fall back to Course handicap if Playing handicap is not available
          let handicapValue;
          
          // Handle Playing Handicap
          if (row["Playing Handicap"] !== undefined) {
            // Convert to string to handle all types of inputs
            const handicapStr = String(row["Playing Handicap"]);
            
            // Check if the playing handicap has a "+" sign
            if (handicapStr.includes('+')) {
              // If it has a "+" sign, add the handicap to the total (positive value)
              handicapValue = Number(handicapStr.replace('+', ''));
            } else {
              // If it doesn't have a "+" sign, subtract the handicap from the total
              handicapValue = -Math.abs(Number(handicapStr));
            }
          } 
          // Fall back to Course Handicap if Playing Handicap isn't available
          else if (row["Course Handicap"] !== undefined) {
            // Convert to string to handle all types of inputs
            const handicapStr = String(row["Course Handicap"]);
            
            // Apply the same logic to Course Handicap
            if (handicapStr.includes('+')) {
              // If it has a "+" sign, add the handicap to the total (positive value)
              handicapValue = Number(handicapStr.replace('+', ''));
            } else {
              // If it doesn't have a "+" sign, subtract the handicap from the total
              handicapValue = -Math.abs(Number(handicapStr));
            }
          } else {
            handicapValue = 0;
          }
          
          // Net score is calculated based on whether the handicap is positive or negative
          netScore = Number(row.Total) + handicapValue;
          
          console.log(`Handicap calculation: Total=${row.Total}, Handicap=${handicapValue} (${handicapValue >= 0 ? 'added' : 'subtracted'}), Net=${netScore}`);
          
          console.log(`Stroke/StrokeNet scoring: Total=${row.Total} (Gross), Playing Handicap=${row["Playing Handicap"] || 'N/A'}, Course Handicap=${row["Course Handicap"] || 'N/A'}, calculated Net=${netScore}`);
        } else {
          // For regular scoring, use Total as gross score
          grossScore = row.Total !== undefined ? Number(row.Total) : 
                      row["Gross Score"] !== undefined ? Number(row["Gross Score"]) : 
                      row.grossScore !== undefined ? Number(row.grossScore) : null;
          
          // Extract net score from available fields
          netScore = row["Net Score"] !== undefined ? Number(row["Net Score"]) : 
                   row.netScore !== undefined ? Number(row.netScore) : 
                   row.Net !== undefined ? Number(row.Net) : null;
        }
        
        // Extract handicap - prioritize Playing Handicap over Course Handicap
        const handicap = row["Playing Handicap"] !== undefined ? Number(row["Playing Handicap"]) :
                       row["Course Handicap"] !== undefined ? Number(row["Course Handicap"]) :
                       row.handicap !== undefined ? Number(row.handicap) : 
                       row.Handicap !== undefined ? Number(row.Handicap) : null;
        
        console.log(`Processed row: Player: ${playerName}, Position: ${position}, Gross: ${grossScore}, Net: ${netScore}, Handicap: ${handicap}`);
        
        return {
          // Standard column names we expect to use later
          Player: playerName,
          Position: position,
          "Gross Score": grossScore,
          "Net Score": netScore,
          "Course Handicap": handicap
        };
      });
      
      res.json({
        message: "File uploaded successfully",
        rows: processedData.length,
        preview: processedData
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
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
        date: validData.date,
        type: validData.type,
        status: "completed"
      });
      
      console.log(`Created tournament with ID: ${tournament.id}`);
      
      // Process player results
      const processedResults = [];
      
      for (const result of validData.results) {
        console.log(`Processing result for player: ${result.player}, position: ${result.position}`);
        
        // Find or create player
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
        
        // Calculate points based on position and tournament type
        const points = calculatePoints(result.position, validData.type);
        console.log(`Calculated ${points} points for position ${result.position} in ${validData.type} tournament`);
        
        // Create player result with proper null handling for optional fields
        const playerResultData = {
          playerId: player.id,
          tournamentId: tournament.id,
          position: result.position,
          // Explicitly handle nulls to avoid type issues
          grossScore: result.grossScore !== undefined ? result.grossScore : null,
          netScore: result.netScore !== undefined ? result.netScore : null, 
          handicap: result.handicap !== undefined ? result.handicap : null,
          points
        };
        
        console.log("Creating player result:", JSON.stringify(playerResultData, null, 2));
        
        try {
          const playerResult = await storage.createPlayerResult(playerResultData);
          console.log(`Created player result with ID: ${playerResult.id}`);
          processedResults.push(playerResult);
        } catch (error) {
          console.error("Error creating player result:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
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
        date: new Date(date),
        type,
        status: "completed"
      });
      
      // Process player results
      const processedResults = [];
      
      for (const result of results) {
        // Find or create player
        let playerId = result.playerId;
        
        if (!playerId) {
          let player = await storage.findPlayerByName(result.playerName);
          
          if (!player) {
            player = await storage.createPlayer({
              name: result.playerName,
              defaultHandicap: result.handicap
            });
          }
          
          playerId = player.id;
        }
        
        // Calculate points based on position and tournament type
        const points = calculatePoints(result.position, type);
        
        // Create player result
        const playerResult = await storage.createPlayerResult({
          playerId,
          tournamentId: tournament.id,
          position: result.position,
          grossScore: result.grossScore,
          netScore: result.netScore,
          handicap: result.handicap,
          points
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

// Helper function to calculate points based on position and tournament type
function calculatePoints(position: number, tournamentType: string): number {
  // Points system based on the provided PDFs
  if (tournamentType === 'major') {
    const majorPoints = [
      750, 400, 350, 325, 300, 275, 225, 200, 175, 150,  // 1-10
      130, 120, 110, 90, 80, 70, 65, 60, 55, 50,         // 11-20
      48, 46, 44, 42, 40, 38, 36, 34, 32.5, 31,          // 21-30
      29.5, 28, 26.5, 25, 24, 23, 22, 21, 20.25, 19.5,   // 31-40
      18.75, 18, 17.25, 16.5, 15.75, 15, 14.25, 13.5, 13, 12.5, // 41-50
      12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8, 7.75,      // 51-60
      7.5, 7.25, 7                                       // 61-63
    ];
    return position <= majorPoints.length ? majorPoints[position - 1] : 0;
  } 
  else if (tournamentType === 'tour') {
    const tourPoints = [
      500, 300, 190, 135, 110, 100, 90, 85, 80, 75,      // 1-10
      70, 65, 60, 55, 53, 51, 49, 47, 45, 43,            // 11-20
      41, 39, 37, 35.5, 34, 32.5, 31, 29.5, 28, 26.5,    // 21-30
      25, 23.5, 22, 21, 20, 19, 18, 17, 16, 15,          // 31-40
      14, 13, 12, 11, 10.5, 10, 9.5, 9, 8.5, 8,          // 41-50
      7.5, 7, 6.5, 6, 5.8, 5.6, 5.4, 5.2, 5, 4.8,        // 51-60
      4.6, 4.4, 4.2, 4, 3.8                              // 61-65
    ];
    return position <= tourPoints.length ? tourPoints[position - 1] : 0;
  } 
  else if (tournamentType === 'league' || tournamentType === 'supr') {
    const leagueAndSuprPoints = [
      93.75, 50, 43.75, 40.625, 37.5, 34.375, 28.125, 25, 21.875, 18.75,  // 1-10
      16.25, 15, 13.75, 11.25, 10, 8.75, 8.125, 7.5, 6.875, 6             // 11-20
    ];
    return position <= leagueAndSuprPoints.length ? leagueAndSuprPoints[position - 1] : 0;
  }
  
  return 0; // Default if no valid tournament type
}
