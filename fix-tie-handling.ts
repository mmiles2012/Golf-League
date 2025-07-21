import { db } from './server/db.js';
import { tournaments, playerResults } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import { storage } from './server/storage-db.js';
import {
  getPointsFromConfig,
  assignPositionsWithTies,
  groupResultsByScore,
  calculateTiePointsFromTable,
} from './server/migration-utils';

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
        .where(eq(playerResults.tournamentId, tournament.id));

      if (results.length === 0) {
        console.log(`   ⚠️  No results found for ${tournament.name}`);
        continue;
      }

      console.log(`   🎯 Found ${results.length} results to check for ties`);

      // Get tournament-specific points table for net scoring
      const netPointsTable = pointsConfig[tournament.type as keyof typeof pointsConfig];
      // Get tour points table for gross scoring (always uses Tour points)
      const grossPointsTable = pointsConfig.tour;
      // Assign net positions and group by net score
      const netValidResults = results.filter(
        (r) => r.netScore !== null && r.netScore !== undefined,
      );
      netValidResults.sort((a, b) => (a.netScore as number) - (b.netScore as number));
      const netPositions = assignPositionsWithTies(netValidResults, 'netScore');
      const netGroups = groupResultsByScore(netValidResults, 'netScore');
      // Assign gross positions and group by gross score
      const grossValidResults = results.filter(
        (r) => r.grossScore !== null && r.grossScore !== undefined,
      );
      grossValidResults.sort((a, b) => (a.grossScore as number) - (b.grossScore as number));
      const grossPositions = assignPositionsWithTies(grossValidResults, 'grossScore');
      const grossGroups = groupResultsByScore(grossValidResults, 'grossScore');
      // Update net points
      let netUpdatedCount = 0;
      for (const group of netGroups) {
        const numTied = group.players.length;
        const points =
          numTied === 1
            ? getPointsFromConfig(
                netPositions.find((p) => p.id === group.players[0].id)?.position || 999,
                netPointsTable,
              )
            : calculateTiePointsFromTable(
                netPositions.find((p) => p.id === group.players[0].id)?.position || 999,
                numTied,
                netPointsTable,
              );
        for (const player of group.players) {
          const pos = netPositions.find((p) => p.id === player.id)?.position;
          if (player.points !== points) {
            await db.update(playerResults).set({ points }).where(eq(playerResults.id, player.id));
            netUpdatedCount++;
            console.log(`   📝 NET: Player ${player.playerId} pos ${pos}: updated to ${points}`);
          }
        }
      }
      // Update gross points
      let grossUpdatedCount = 0;
      for (const group of grossGroups) {
        const numTied = group.players.length;
        const points =
          numTied === 1
            ? getPointsFromConfig(
                grossPositions.find((p) => p.id === group.players[0].id)?.position || 999,
                grossPointsTable,
              )
            : calculateTiePointsFromTable(
                grossPositions.find((p) => p.id === group.players[0].id)?.position || 999,
                numTied,
                grossPointsTable,
              );
        for (const player of group.players) {
          const pos = grossPositions.find((p) => p.id === player.id)?.position;
          if (player.grossPoints !== points) {
            await db
              .update(playerResults)
              .set({ grossPoints: points })
              .where(eq(playerResults.id, player.id));
            grossUpdatedCount++;
            console.log(
              `   📝 GROSS: Player ${player.playerId} gross pos ${pos}: updated to ${points}`,
            );
          }
        }
      }
      totalNetUpdated += netUpdatedCount;
      totalGrossUpdated += grossUpdatedCount;
      console.log(
        `   ✅ Fixed ${netUpdatedCount} net tie points and ${grossUpdatedCount} gross tie points`,
      );
    }
    console.log(`\n🎉 Tie handling fix completed!`);
    console.log(`Total net tie points fixed: ${totalNetUpdated}`);
    console.log(`Total gross tie points fixed: ${totalGrossUpdated}`);
    console.log(`All tied positions now use properly averaged points!`);
  } catch (error) {
    console.error('❌ Error during tie handling fix:', error);
  }
}

// Run the tie handling fix
fixTieHandling()
  .then(() => {
    console.log('\n🎉 All tie handling issues have been fixed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Tie fix failed:', error);
    process.exit(1);
  });
