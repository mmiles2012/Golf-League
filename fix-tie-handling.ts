import { db } from './server/db.js';
import { tournaments, playerResults } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import { storage } from './server/storage-db.js';

/**
 * Fix tie handling for all tournaments
 * Recalculate points for tied positions using proper averaging
 */

async function fixTieHandling(): Promise<void> {
  console.log('🔧 Starting tie handling fix for all tournaments...');
  
  try {
    // Get the points configuration from database
    const pointsConfig = await storage.getPointsConfig();
    console.log('📊 Retrieved points configuration from database');
    
    // Get all tournaments
    const allTournaments = await db.select().from(tournaments);
    console.log(`Found ${allTournaments.length} tournaments to process`);
    
    let totalNetUpdated = 0;
    let totalGrossUpdated = 0;
    
    for (const tournament of allTournaments) {
      console.log(`\n📊 Processing tournament: ${tournament.name} (${tournament.type})`);
      
      // Get all results for this tournament
      const results = await db
        .select()
        .from(playerResults)
        .where(eq(playerResults.tournamentId, tournament.id))
        .orderBy(playerResults.position);
      
      if (results.length === 0) {
        console.log(`   ⚠️  No results found for ${tournament.name}`);
        continue;
      }
      
      console.log(`   🎯 Found ${results.length} results to check for ties`);
      
      // Get tournament-specific points table for net scoring
      const netPointsTable = pointsConfig[tournament.type as keyof typeof pointsConfig];
      
      // Get tour points table for gross scoring (always uses Tour points)
      const grossPointsTable = pointsConfig.tour;
      
      // Group results by net score to detect ties
      const netScoreGroups = new Map<number, typeof results>();
      const grossScoreGroups = new Map<number, typeof results>();
      
      for (const result of results) {
        if (result.netScore) {
          if (!netScoreGroups.has(result.netScore)) {
            netScoreGroups.set(result.netScore, []);
          }
          netScoreGroups.get(result.netScore)!.push(result);
        }
        
        if (result.grossScore) {
          if (!grossScoreGroups.has(result.grossScore)) {
            grossScoreGroups.set(result.grossScore, []);
          }
          grossScoreGroups.get(result.grossScore)!.push(result);
        }
      }
      
      let netUpdatedCount = 0;
      let grossUpdatedCount = 0;
      
      // Process NET score ties
      for (const [netScore, tiedPlayers] of netScoreGroups) {
        if (tiedPlayers.length > 1) {
          // Found a tie - calculate averaged points
          const firstPosition = Math.min(...tiedPlayers.map(p => p.position || 999));
          const lastPosition = firstPosition + tiedPlayers.length - 1;
          
          let totalPoints = 0;
          for (let pos = firstPosition; pos <= lastPosition; pos++) {
            totalPoints += getPointsFromConfig(pos, netPointsTable);
          }
          const averagePoints = totalPoints / tiedPlayers.length;
          
          console.log(`   🔗 NET TIE: ${tiedPlayers.length} players at net ${netScore}, positions ${firstPosition}-${lastPosition}, average points: ${averagePoints}`);
          
          // Update all tied players with averaged points
          for (const player of tiedPlayers) {
            if (player.points !== averagePoints) {
              console.log(`      📝 Player ${player.playerId}: ${player.points} → ${averagePoints}`);
              await db
                .update(playerResults)
                .set({ points: averagePoints })
                .where(eq(playerResults.id, player.id));
              netUpdatedCount++;
            }
          }
        }
      }
      
      // Process GROSS score ties
      for (const [grossScore, tiedPlayers] of grossScoreGroups) {
        if (tiedPlayers.length > 1) {
          // Found a tie - calculate averaged points
          const firstPosition = Math.min(...tiedPlayers.map(p => p.grossPosition || 999));
          const lastPosition = firstPosition + tiedPlayers.length - 1;
          
          let totalPoints = 0;
          for (let pos = firstPosition; pos <= lastPosition; pos++) {
            totalPoints += getPointsFromConfig(pos, grossPointsTable);
          }
          const averagePoints = totalPoints / tiedPlayers.length;
          
          console.log(`   🔗 GROSS TIE: ${tiedPlayers.length} players at gross ${grossScore}, positions ${firstPosition}-${lastPosition}, average points: ${averagePoints}`);
          
          // Update all tied players with averaged points
          for (const player of tiedPlayers) {
            if (player.grossPoints !== averagePoints) {
              console.log(`      📝 Player ${player.playerId}: ${player.grossPoints} → ${averagePoints}`);
              await db
                .update(playerResults)
                .set({ grossPoints: averagePoints })
                .where(eq(playerResults.id, player.id));
              grossUpdatedCount++;
            }
          }
        }
      }
      
      console.log(`   ✅ Fixed ${netUpdatedCount} net tie points and ${grossUpdatedCount} gross tie points`);
      totalNetUpdated += netUpdatedCount;
      totalGrossUpdated += grossUpdatedCount;
    }
    
    console.log(`\n🎉 Tie handling fix completed!`);
    console.log(`Total net tie points fixed: ${totalNetUpdated}`);
    console.log(`Total gross tie points fixed: ${totalGrossUpdated}`);
    console.log(`All tied positions now use properly averaged points!`);
    
  } catch (error) {
    console.error('❌ Error during tie handling fix:', error);
  }
}

function getPointsFromConfig(position: number, pointsTable: Array<{ position: number; points: number }>): number {
  const entry = pointsTable.find(p => p.position === position);
  return entry ? entry.points : 0;
}

// Run the tie handling fix
fixTieHandling()
  .then(() => {
    console.log('\n🎉 All tie handling issues have been fixed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Tie fix failed:', error);
    process.exit(1);
  });