import { db } from './server/db';
import { playerResults, tournaments } from './shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { TieHandler } from './server/tie-handler';
import { calculateGrossPoints } from './server/utils';

interface PlayerResult {
  id: number;
  playerId: number;
  playerName: string;
  grossScore: number | null;
  netScore: number | null;
  handicap: number | null;
}

async function fixGrossPointsZero() {
  console.log('🔧 Starting gross points fix for zero values...');
  
  try {
    // Get all tournaments
    const allTournaments = await db.select().from(tournaments);
    console.log(`Found ${allTournaments.length} tournaments to process`);
    
    for (const tournament of allTournaments) {
      console.log(`\n📊 Processing tournament: ${tournament.name} (ID: ${tournament.id})`);
      
      // Get all results for this tournament that have zero gross points
      const results = await db
        .select({
          id: playerResults.id,
          playerId: playerResults.playerId,
          grossScore: playerResults.grossScore,
          netScore: playerResults.netScore,
          handicap: playerResults.handicap,
          points: playerResults.points,
          grossPoints: playerResults.grossPoints
        })
        .from(playerResults)
        .where(and(
          eq(playerResults.tournamentId, tournament.id),
          eq(playerResults.grossPoints, 0),
          isNotNull(playerResults.grossScore)
        ));
        
      if (results.length === 0) {
        console.log(`   ✅ No zero gross points found for tournament ${tournament.name}`);
        continue;
      }
      
      console.log(`   🎯 Found ${results.length} players with zero gross points`);
      
      // Get all results for this tournament to calculate proper gross positions
      const allTournamentResults = await db
        .select({
          id: playerResults.id,
          playerId: playerResults.playerId,
          grossScore: playerResults.grossScore,
          netScore: playerResults.netScore,
          handicap: playerResults.handicap
        })
        .from(playerResults)
        .where(and(
          eq(playerResults.tournamentId, tournament.id),
          isNotNull(playerResults.grossScore)
        ));
      
      // Convert to format expected by TieHandler
      const playerData: PlayerResult[] = allTournamentResults.map(result => ({
        id: result.id,
        playerId: result.playerId,
        playerName: `Player ${result.playerId}`, // We don't need actual names for tie handling
        grossScore: result.grossScore,
        netScore: result.netScore,
        handicap: result.handicap
      }));
      
      // Calculate gross positions with tie handling
      const tieHandler = new TieHandler();
      const grossPositions = tieHandler.processResults(playerData, 'grossScore');
      
      console.log(`   🔢 Calculated gross positions for ${grossPositions.length} players`);
      
      // Update gross points for each player with zero gross points
      let updatedCount = 0;
      for (const player of grossPositions) {
        // Only update players that currently have zero gross points
        const hasZeroGrossPoints = results.some(r => r.id === player.id);
        if (!hasZeroGrossPoints) continue;
        
        // Calculate gross points using Tour points table
        const grossPoints = calculateGrossPoints(player.position);
        
        // Update the database
        await db
          .update(playerResults)
          .set({ grossPoints })
          .where(eq(playerResults.id, player.id));
        
        updatedCount++;
        console.log(`   📝 Updated player ${player.playerId}: position ${player.position} → ${grossPoints} gross points`);
      }
      
      console.log(`   ✅ Updated ${updatedCount} players with correct gross points`);
    }
    
    console.log('\n🎉 Gross points fix completed successfully!');
    
    // Verify the fix
    const remainingZeroGrossPoints = await db
      .select()
      .from(playerResults)
      .where(and(
        eq(playerResults.grossPoints, 0),
        isNotNull(playerResults.grossScore)
      ));
    
    console.log(`\n📊 Verification: ${remainingZeroGrossPoints.length} players still have zero gross points`);
    
  } catch (error) {
    console.error('❌ Error during gross points fix:', error);
  } finally {
    await client.end();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  fixGrossPointsZero();
}

export { fixGrossPointsZero };