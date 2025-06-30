import { db } from "./server/db";
import { playerResults, tournaments, players } from "./shared/schema";
import { eq } from "drizzle-orm";
import { TieHandler } from "./server/tie-handler";
import { calculateGrossPoints } from "./server/utils";

// Points configuration for tie handler
const pointsConfig = {
  major: [
    { position: 1, points: 750 }, { position: 2, points: 400 }, { position: 3, points: 350 },
    { position: 4, points: 325 }, { position: 5, points: 300 }, { position: 6, points: 275 },
    { position: 7, points: 225 }, { position: 8, points: 200 }, { position: 9, points: 175 },
    { position: 10, points: 150 }
  ],
  tour: [
    { position: 1, points: 500 }, { position: 2, points: 300 }, { position: 3, points: 190 },
    { position: 4, points: 135 }, { position: 5, points: 110 }, { position: 6, points: 100 },
    { position: 7, points: 90 }, { position: 8, points: 85 }, { position: 9, points: 80 },
    { position: 10, points: 75 }
  ],
  league: [
    { position: 1, points: 93.75 }, { position: 2, points: 50 }, { position: 3, points: 43.75 },
    { position: 4, points: 40.625 }, { position: 5, points: 37.5 }, { position: 6, points: 34.375 },
    { position: 7, points: 28.125 }, { position: 8, points: 25 }, { position: 9, points: 21.875 },
    { position: 10, points: 18.75 }
  ],
  supr: [
    { position: 1, points: 93.75 }, { position: 2, points: 50 }, { position: 3, points: 43.75 },
    { position: 4, points: 40.625 }, { position: 5, points: 37.5 }, { position: 6, points: 34.375 },
    { position: 7, points: 28.125 }, { position: 8, points: 25 }, { position: 9, points: 21.875 },
    { position: 10, points: 18.75 }
  ]
};

async function fixGrossPointsTies() {
  console.log("Starting gross points tie fix migration...");
  
  try {
    // Get all tournaments
    const allTournaments = await db.select().from(tournaments);
    console.log(`Found ${allTournaments.length} tournaments to process`);
    
    let totalUpdated = 0;
    
    for (const tournament of allTournaments) {
      console.log(`\nProcessing tournament: ${tournament.name} (ID: ${tournament.id})`);
      
      // Get all results for this tournament
      const results = await db.select({
        id: playerResults.id,
        playerId: playerResults.playerId,
        grossScore: playerResults.grossScore,
        netScore: playerResults.netScore,
        handicap: playerResults.handicap,
        currentGrossPoints: playerResults.grossPoints
      })
      .from(playerResults)
      .where(eq(playerResults.tournamentId, tournament.id));
      
      if (results.length === 0) {
        console.log("  No results found, skipping...");
        continue;
      }
      
      // Get player names for tie handler
      const playerData = [];
      for (const result of results) {
        const player = await db.select({ name: players.name })
          .from(players)
          .where(eq(players.id, result.playerId));
        
        if (player.length > 0) {
          playerData.push({
            playerId: result.playerId,
            playerName: player[0].name,
            grossScore: result.grossScore,
            netScore: result.netScore,
            handicap: result.handicap
          });
        }
      }
      
      if (playerData.length === 0) {
        console.log("  No valid player data found, skipping...");
        continue;
      }
      
      // Create tie handler with gross points configuration
      const grossTieHandler = new TieHandler({
        ...pointsConfig,
        tour: pointsConfig.tour.map(entry => ({ 
          position: entry.position, 
          points: calculateGrossPoints(entry.position) 
        }))
      });
      
      // Process gross score ties
      const processedGrossResults = grossTieHandler.processResultsWithTies(
        playerData,
        'tour', // Always use tour points for gross regardless of tournament type
        'gross'
      );
      
      console.log(`  Processed ${processedGrossResults.length} results with proper gross tie handling`);
      
      // Update gross points for each player
      let tournamentUpdated = 0;
      for (const grossResult of processedGrossResults) {
        const currentResult = results.find(r => r.playerId === grossResult.playerId);
        if (currentResult && currentResult.currentGrossPoints !== grossResult.points) {
          await db.update(playerResults)
            .set({ grossPoints: grossResult.points })
            .where(eq(playerResults.id, currentResult.id));
          
          console.log(`    Updated ${grossResult.playerName}: ${currentResult.currentGrossPoints} -> ${grossResult.points} gross points`);
          tournamentUpdated++;
          totalUpdated++;
        }
      }
      
      console.log(`  Updated ${tournamentUpdated} player results in this tournament`);
    }
    
    console.log(`\n✅ Migration completed! Updated ${totalUpdated} player results with corrected gross points.`);
    
  } catch (error) {
    console.error("❌ Error during migration:", error);
    throw error;
  }
}

// Run the migration
fixGrossPointsTies()
  .then(() => {
    console.log("Migration script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });