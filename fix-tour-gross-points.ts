import { db } from "./server/db";
import { playerResults, tournaments } from "./shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { getPointsFromConfig } from './server/migration-utils';
import { storage } from "./server/storage-db";

async function fixTourGrossPoints() {
  console.log('🔧 Starting tour tournament gross points fix with database values...');
  
  try {
    // Get the points configuration from database
    const pointsConfig = await storage.getPointsConfig();
    console.log('📊 Retrieved points configuration from database');
    console.log('Tour points 1st-5th positions:', pointsConfig.tour.slice(0, 5));
    
    // Get all tour tournaments
    const tourTournaments = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.type, 'tour'));
    
    console.log(`Found ${tourTournaments.length} tour tournaments to process`);
    
    let totalUpdated = 0;
    
    for (const tournament of tourTournaments) {
      console.log(`\n📊 Processing tour tournament: ${tournament.name} (ID: ${tournament.id})`);
      
      // Get all results for this tournament
      const results = await db
        .select({
          id: playerResults.id,
          playerId: playerResults.playerId,
          grossPosition: playerResults.grossPosition,
          grossPoints: playerResults.grossPoints
        })
        .from(playerResults)
        .where(and(
          eq(playerResults.tournamentId, tournament.id),
          isNotNull(playerResults.grossPosition)
        ));
        
      if (results.length === 0) {
        console.log(`   ⚠️  No results found for tournament ${tournament.name}`);
        continue;
      }
      
      console.log(`   🎯 Found ${results.length} results to check/fix`);
      
      // Update gross points for each player using tour points table from database
      let updatedCount = 0;
      for (const result of results) {
        // Calculate correct gross points using tour points table from database
        const correctGrossPoints = getPointsFromConfig(result.grossPosition || 999, pointsConfig.tour);
        
        // Only update if the points are different
        if (result.grossPoints !== correctGrossPoints) {
          await db
            .update(playerResults)
            .set({ grossPoints: correctGrossPoints })
            .where(eq(playerResults.id, result.id));
          
          updatedCount++;
          console.log(`   📝 Updated player ${result.playerId}: position ${result.grossPosition} → ${correctGrossPoints} tour gross points (was ${result.grossPoints})`);
        } else {
          console.log(`   ✅ Player ${result.playerId}: position ${result.grossPosition} already has correct ${correctGrossPoints} points`);
        }
      }
      
      console.log(`   ✅ Updated ${updatedCount} players with correct tour gross points`);
      totalUpdated += updatedCount;
    }
    
    console.log(`\n🎉 Tour tournament gross points fix completed! Updated ${totalUpdated} total results`);
    
  } catch (error) {
    console.error('❌ Error during tour gross points fix:', error);
    throw error;
  }
}

// Run the fix
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  fixTourGrossPoints()
    .then(() => {
      console.log('✅ Tour gross points fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Tour gross points fix failed:', error);
      process.exit(1);
    });
}

export { fixTourGrossPoints };