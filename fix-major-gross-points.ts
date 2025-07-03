import { db } from "./server/db";
import { playerResults, tournaments } from "./shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { calculateGrossPoints } from './server/gross-points-utils';
import { storage } from "./server/storage-db";

async function fixMajorGrossPoints() {
  console.log('🔧 Starting major tournament gross points fix...');
  
  try {
    // Get the points configuration from database
    const pointsConfig = await storage.getPointsConfig();
    console.log('📊 Retrieved points configuration from database');
    
    // Get all major tournaments
    const majorTournaments = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.type, 'major'));
    
    console.log(`Found ${majorTournaments.length} major tournaments to process`);
    
    for (const tournament of majorTournaments) {
      console.log(`\n📊 Processing major tournament: ${tournament.name} (ID: ${tournament.id})`);
      
      // Get all results for this tournament
      const results = await db
        .select({
          id: playerResults.id,
          playerId: playerResults.playerId,
          grossScore: playerResults.grossScore,
          grossPosition: playerResults.grossPosition,
          grossPoints: playerResults.grossPoints
        })
        .from(playerResults)
        .where(and(
          eq(playerResults.tournamentId, tournament.id),
          isNotNull(playerResults.grossScore)
        ));
        
      if (results.length === 0) {
        console.log(`   ⚠️  No results found for tournament ${tournament.name}`);
        continue;
      }
      
      console.log(`   🎯 Found ${results.length} results to recalculate gross points`);
      
      // Update gross points for each player using major points table
      let updatedCount = 0;
      for (const result of results) {
        // Calculate correct gross points using major points table from database
        const correctGrossPoints = calculateGrossPoints(result.grossPosition || 999, 'major', pointsConfig);
        
        // Only update if the points are different
        if (result.grossPoints !== correctGrossPoints) {
          await db
            .update(playerResults)
            .set({ grossPoints: correctGrossPoints })
            .where(eq(playerResults.id, result.id));
          
          updatedCount++;
          console.log(`   📝 Updated player ${result.playerId}: position ${result.grossPosition} → ${correctGrossPoints} major gross points (was ${result.grossPoints})`);
        }
      }
      
      console.log(`   ✅ Updated ${updatedCount} players with correct major gross points`);
    }
    
    console.log('\n🎉 Major tournament gross points fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during major gross points fix:', error);
    throw error;
  }
}

// Run the fix if this file is executed directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  fixMajorGrossPoints()
    .then(() => {
      console.log('Fix completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fix failed:', error);
      process.exit(1);
    });
}

export { fixMajorGrossPoints };