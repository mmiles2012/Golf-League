import { db } from './server/db.js';
import { tournaments, playerResults } from './shared/schema.js';
import { eq, and, isNotNull } from 'drizzle-orm';
import { storage } from './server/storage-db.js';
import { getPointsFromConfig, logPointsConfig, assignPositionsWithTies, groupResultsByScore, calculateTiePointsFromTable, shouldSkipTournament } from './server/migration-utils';

/**
 * Comprehensive fix for all hardcoded points values in the database
 * This script will recalculate ALL tournament points using database configuration
 * instead of any remaining hardcoded values
 * 
 * Note: Manual entry tournaments are automatically excluded from recalculation
 */

async function fixAllHardcodedPoints(): Promise<void> {
  console.log('🔧 Starting comprehensive fix for all hardcoded points values...');
  
  try {
    // Get the points configuration from database
    const pointsConfig = await storage.getPointsConfig();
    console.log('📊 Retrieved points configuration from database');
    logPointsConfig(pointsConfig);
    
    // Get all tournaments (including the isManualEntry field)
    const allTournaments = await db.select().from(tournaments);
    console.log(`Found ${allTournaments.length} tournaments to process`);
    
    let totalNetUpdated = 0;
    let totalGrossUpdated = 0;
    let skippedManualEntry = 0;
    
    for (const tournament of allTournaments) {
      console.log(`\n📊 Processing tournament: ${tournament.name} (${tournament.type})`);
      
      // Skip manual entry tournaments
      if (shouldSkipTournament(tournament)) {
        skippedManualEntry++;
        continue;
      }
      
      // Get all results for this tournament
      const results = await db
        .select()
        .from(playerResults)
        .where(eq(playerResults.tournamentId, tournament.id));
      
      if (results.length === 0) {
        console.log(`   ⚠️  No results found for ${tournament.name}`);
        continue;
      }
      
      console.log(`   🎯 Found ${results.length} results to verify`);
      
      // Get tournament-specific points table for net scoring
      const netPointsTable = pointsConfig[tournament.type as keyof typeof pointsConfig];
      // Get tour points table for gross scoring (always uses Tour points)
      const grossPointsTable = pointsConfig.tour;
      
      // Assign net positions and group by net score
      const netValidResults = results.filter(r => r.netScore !== null && r.netScore !== undefined);
      netValidResults.sort((a, b) => (a.netScore as number) - (b.netScore as number));
      const netPositions = assignPositionsWithTies(netValidResults, 'netScore');
      const netGroups = groupResultsByScore(netValidResults, 'netScore');
      // Assign gross positions and group by gross score
      const grossValidResults = results.filter(r => r.grossScore !== null && r.grossScore !== undefined);
      grossValidResults.sort((a, b) => (a.grossScore as number) - (b.grossScore as number));
      const grossPositions = assignPositionsWithTies(grossValidResults, 'grossScore');
      const grossGroups = groupResultsByScore(grossValidResults, 'grossScore');
      // Update net points
      let netUpdatedCount = 0;
      for (const group of netGroups) {
        const numTied = group.players.length;
        const points = numTied === 1
          ? getPointsFromConfig(netPositions.find(p => p.id === group.players[0].id)?.position || 999, netPointsTable)
          : calculateTiePointsFromTable(netPositions.find(p => p.id === group.players[0].id)?.position || 999, numTied, netPointsTable);
        for (const player of group.players) {
          const pos = netPositions.find(p => p.id === player.id)?.position;
          if (player.points !== points) {
            await db
              .update(playerResults)
              .set({ points })
              .where(eq(playerResults.id, player.id));
            netUpdatedCount++;
            console.log(`   📝 NET: Player ${player.playerId} pos ${pos}: updated to ${points}`);
          }
        }
      }
      // Update gross points
      let grossUpdatedCount = 0;
      for (const group of grossGroups) {
        const numTied = group.players.length;
        const points = numTied === 1
          ? getPointsFromConfig(grossPositions.find(p => p.id === group.players[0].id)?.position || 999, grossPointsTable)
          : calculateTiePointsFromTable(grossPositions.find(p => p.id === group.players[0].id)?.position || 999, numTied, grossPointsTable);
        for (const player of group.players) {
          const pos = grossPositions.find(p => p.id === player.id)?.position;
          if (player.grossPoints !== points) {
            await db
              .update(playerResults)
              .set({ grossPoints: points })
              .where(eq(playerResults.id, player.id));
            grossUpdatedCount++;
            console.log(`   📝 GROSS: Player ${player.playerId} gross pos ${pos}: updated to ${points}`);
          }
        }
      }
      totalNetUpdated += netUpdatedCount;
      totalGrossUpdated += grossUpdatedCount;
      console.log(`   ✅ Updated ${netUpdatedCount} net points and ${grossUpdatedCount} gross points`);
    }
    
    console.log(`\n🎉 Comprehensive points fix completed!`);
    console.log(`Total net points updated: ${totalNetUpdated}`);
    console.log(`Total gross points updated: ${totalGrossUpdated}`);
    console.log(`All tournaments now use database points configuration!`);
    console.log(`📋 Summary:`);
    console.log(`   - Processed: ${allTournaments.length - skippedManualEntry} tournaments`);
    console.log(`   - Skipped manual entry: ${skippedManualEntry} tournaments`);
    console.log(`   - Net points updated: ${totalNetUpdated}`);
    console.log(`   - Gross points updated: ${totalGrossUpdated}`);
    
  } catch (error) {
    console.error('❌ Error during comprehensive points fix:', error);
  }
}

// Run the comprehensive fix
fixAllHardcodedPoints()
  .then(() => {
    console.log('\n🎉 All hardcoded points have been fixed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });