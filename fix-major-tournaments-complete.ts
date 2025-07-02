import { db } from "./server/db";
import { playerResults, tournaments } from "./shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { calculateGrossPoints } from "./server/utils";

async function fixMajorTournamentsComplete() {
  console.log('🔧 Starting complete major tournament fix (gross positions + gross points)...');
  
  try {
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
      
      console.log(`   🎯 Found ${results.length} results to fix`);
      
      // Sort by gross score to determine gross positions
      const sortedResults = [...results]
        .sort((a, b) => (a.grossScore || 999) - (b.grossScore || 999));
      
      // Calculate gross positions with tie handling
      const grossPositions: Array<{ id: number, playerId: number, position: number }> = [];
      let currentPosition = 1;
      
      for (let i = 0; i < sortedResults.length; i++) {
        const currentPlayer = sortedResults[i];
        
        // Check for ties with previous player
        if (i > 0 && currentPlayer.grossScore === sortedResults[i - 1].grossScore) {
          // Tie - use same position as previous player
          grossPositions.push({
            id: currentPlayer.id,
            playerId: currentPlayer.playerId,
            position: grossPositions[grossPositions.length - 1].position
          });
        } else {
          // New position (skip positions if there were ties)
          currentPosition = i + 1;
          grossPositions.push({
            id: currentPlayer.id,
            playerId: currentPlayer.playerId,
            position: currentPosition
          });
        }
      }
      
      console.log(`   🔢 Calculated gross positions for ${grossPositions.length} players`);
      
      // Update both gross position and gross points using major points table
      let updatedCount = 0;
      for (const player of grossPositions) {
        // Calculate correct gross points using major points table
        const correctGrossPoints = calculateGrossPoints(player.position, 'major');
        
        // Update both gross position and gross points
        await db
          .update(playerResults)
          .set({ 
            grossPosition: player.position,
            grossPoints: correctGrossPoints 
          })
          .where(eq(playerResults.id, player.id));
        
        updatedCount++;
        console.log(`   📝 Updated player ${player.playerId}: gross position ${player.position}, major gross points ${correctGrossPoints}`);
      }
      
      console.log(`   ✅ Updated ${updatedCount} players with correct gross positions and major gross points`);
    }
    
    console.log('\n🎉 Complete major tournament fix completed successfully!');
    
    // Verify the fix
    const majorResults = await db
      .select({
        tournamentName: tournaments.name,
        playerName: playerResults.playerId,
        grossPosition: playerResults.grossPosition,
        grossPoints: playerResults.grossPoints
      })
      .from(playerResults)
      .innerJoin(tournaments, eq(playerResults.tournamentId, tournaments.id))
      .where(and(
        eq(tournaments.type, 'major'),
        isNotNull(playerResults.grossScore)
      ))
      .limit(5);
    
    console.log('\n📊 Sample verification results:');
    majorResults.forEach(result => {
      console.log(`   ${result.tournamentName} - Player ${result.playerName}: Position ${result.grossPosition}, Points ${result.grossPoints}`);
    });
    
  } catch (error) {
    console.error('❌ Error during complete major tournament fix:', error);
    throw error;
  }
}

// Run the fix if this file is executed directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  fixMajorTournamentsComplete()
    .then(() => {
      console.log('Complete fix completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Complete fix failed:', error);
      process.exit(1);
    });
}

export { fixMajorTournamentsComplete };