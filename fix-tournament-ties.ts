import { db } from "./server/db";
import { tournaments, playerResults } from "./shared/schema";
import { TieHandler } from "./server/tie-handler";
import { eq } from "drizzle-orm";

interface PointsConfig {
  major: Record<string, number>;
  tour: Record<string, number>;
  league: Record<string, number>;
  supr: Record<string, number>;
}

// Default points configuration
const DEFAULT_POINTS_CONFIG: PointsConfig = {
  major: {
    "1": 750, "2": 400, "3": 350, "4": 325, "5": 300, "6": 275, "7": 225, "8": 200, "9": 175, "10": 150,
    "11": 130, "12": 120, "13": 110, "14": 90, "15": 80, "16": 70, "17": 65, "18": 60, "19": 55, "20": 50,
    "21": 48, "22": 46, "23": 44, "24": 42, "25": 40, "26": 38, "27": 36, "28": 34, "29": 32.5, "30": 31,
    "31": 29.5, "32": 28, "33": 26.5, "34": 25, "35": 24, "36": 23, "37": 22, "38": 21, "39": 20.25, "40": 19.5,
  },
  tour: {
    "1": 500, "2": 300, "3": 190, "4": 135, "5": 110, "6": 100, "7": 90, "8": 85, "9": 80, "10": 75,
    "11": 70, "12": 65, "13": 60, "14": 55, "15": 53, "16": 51, "17": 49, "18": 47, "19": 45, "20": 43,
    "21": 41, "22": 39, "23": 37, "24": 35.5, "25": 34, "26": 32.5, "27": 31, "28": 29.5, "29": 28, "30": 26.5,
  },
  league: {
    "1": 93.75, "2": 50, "3": 43.75, "4": 40.625, "5": 37.5, "6": 34.375, "7": 28.125, "8": 25, "9": 21.875, "10": 18.75,
    "11": 16.25, "12": 15, "13": 13.75, "14": 11.25, "15": 10, "16": 8.75, "17": 8.125, "18": 7.5, "19": 6.875, "20": 6
  },
  supr: {
    "1": 93.75, "2": 50, "3": 43.75, "4": 40.625, "5": 37.5, "6": 34.375, "7": 28.125, "8": 25, "9": 21.875, "10": 18.75,
    "11": 16.25, "12": 15, "13": 13.75, "14": 11.25, "15": 10, "16": 8.75, "17": 8.125, "18": 7.5, "19": 6.875, "20": 6
  }
};

async function fixTournamentTies() {
  console.log("Starting tie correction for all tournaments...");
  
  // Get all tournaments
  const allTournaments = await db.select().from(tournaments);
  console.log(`Found ${allTournaments.length} tournaments to process`);
  
  const tieHandler = new TieHandler(DEFAULT_POINTS_CONFIG);
  
  for (const tournament of allTournaments) {
    console.log(`\nProcessing tournament: ${tournament.name} (ID: ${tournament.id})`);
    
    // Get all results for this tournament
    const results = await db.select({
      id: playerResults.id,
      playerId: playerResults.playerId,
      position: playerResults.position,
      grossScore: playerResults.grossScore,
      netScore: playerResults.netScore,
      handicap: playerResults.handicap,
      points: playerResults.points
    }).from(playerResults)
      .where(eq(playerResults.tournamentId, tournament.id));
    
    if (results.length === 0) {
      console.log("  No results found, skipping...");
      continue;
    }
    
    console.log(`  Found ${results.length} player results`);
    
    // Prepare data for tie handling
    const playerData = results.map(result => ({
      playerId: result.playerId,
      playerName: `Player ${result.playerId}`, // We don't need names for this process
      grossScore: result.grossScore,
      netScore: result.netScore,
      handicap: result.handicap
    }));
    
    // Determine scoring type - assume StrokeNet for most, Stroke for tournaments with "Open" in name
    const scoreType = tournament.name.toLowerCase().includes('open') ? 'gross' : 'net';
    console.log(`  Using ${scoreType} scoring for tie detection`);
    
    // Process with tie handling
    const processedResults = tieHandler.processResultsWithTies(playerData, tournament.type, scoreType);
    
    // Check if any changes are needed
    let changesNeeded = false;
    const updates: Array<{id: number, newPosition: number, newPoints: number, oldPosition: number, oldPoints: number}> = [];
    
    for (let i = 0; i < processedResults.length; i++) {
      const processed = processedResults[i];
      const original = results.find(r => r.playerId === processed.playerId);
      
      if (original && (original.position !== processed.position || Math.abs((original.points || 0) - processed.points) > 0.01)) {
        changesNeeded = true;
        updates.push({
          id: original.id,
          newPosition: processed.position,
          newPoints: processed.points,
          oldPosition: original.position,
          oldPoints: original.points || 0
        });
      }
    }
    
    if (!changesNeeded) {
      console.log("  No changes needed - positions and points are already correct");
      continue;
    }
    
    console.log(`  Found ${updates.length} results that need updating:`);
    
    // Apply updates
    for (const update of updates) {
      console.log(`    Player ${results.find(r => r.id === update.id)?.playerId}: Position ${update.oldPosition}→${update.newPosition}, Points ${update.oldPoints}→${update.newPoints}`);
      
      await db.update(playerResults)
        .set({ 
          position: update.newPosition,
          points: update.newPoints
        })
        .where(eq(playerResults.id, update.id));
    }
    
    console.log(`  ✓ Updated ${updates.length} player results`);
  }
  
  console.log("\n✓ Tie correction completed for all tournaments!");
}

// Run the migration
fixTournamentTies().catch(console.error);