import { db } from './server/db';
import { playerResults, tournaments } from './shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

async function migrateGrossPositions() {
  console.log('🔧 Starting gross position migration for existing tournament results...');

  try {
    // Get all tournaments
    const allTournaments = await db.select().from(tournaments);
    console.log(`Found ${allTournaments.length} tournaments to process`);

    for (const tournament of allTournaments) {
      console.log(`\n📊 Processing tournament: ${tournament.name} (ID: ${tournament.id})`);

      // Get all results for this tournament that have null gross positions but have gross scores
      const results = await db
        .select({
          id: playerResults.id,
          playerId: playerResults.playerId,
          grossScore: playerResults.grossScore,
          grossPosition: playerResults.grossPosition,
        })
        .from(playerResults)
        .where(
          and(eq(playerResults.tournamentId, tournament.id), isNotNull(playerResults.grossScore)),
        );

      if (results.length === 0) {
        console.log(`   ⚠️  No results found for tournament ${tournament.name}`);
        continue;
      }

      // Filter results that need gross position updates (null or missing)
      const resultsToUpdate = results.filter((r) => r.grossPosition === null);

      if (resultsToUpdate.length === 0) {
        console.log(
          `   ✅ All ${results.length} results already have gross positions for tournament ${tournament.name}`,
        );
        continue;
      }

      console.log(
        `   🎯 Found ${resultsToUpdate.length} results needing gross position updates out of ${results.length} total`,
      );

      // Sort all results by gross score to determine gross positions
      const sortedResults = [...results]
        .filter((r) => r.grossScore !== null)
        .sort((a, b) => (a.grossScore || 999) - (b.grossScore || 999));

      // Calculate gross positions with tie handling
      const grossPositions: Array<{ id: number; playerId: number; position: number }> = [];
      let currentPosition = 1;

      for (let i = 0; i < sortedResults.length; i++) {
        const currentPlayer = sortedResults[i];

        // Check for ties with previous player
        if (i > 0 && currentPlayer.grossScore === sortedResults[i - 1].grossScore) {
          // Tie - use same position as previous player
          grossPositions.push({
            id: currentPlayer.id,
            playerId: currentPlayer.playerId,
            position: grossPositions[grossPositions.length - 1].position,
          });
        } else {
          // New position (skip positions if there were ties)
          currentPosition = i + 1;
          grossPositions.push({
            id: currentPlayer.id,
            playerId: currentPlayer.playerId,
            position: currentPosition,
          });
        }
      }

      console.log(`   🔢 Calculated gross positions for ${grossPositions.length} players`);

      // Update gross positions for players that currently have null gross positions
      let updatedCount = 0;
      for (const player of grossPositions) {
        // Only update players that currently have null gross positions
        const needsUpdate = resultsToUpdate.some((r) => r.id === player.id);
        if (!needsUpdate) continue;

        // Update the database
        await db
          .update(playerResults)
          .set({ grossPosition: player.position })
          .where(eq(playerResults.id, player.id));

        updatedCount++;
        console.log(`   📝 Updated player ${player.playerId}: gross position ${player.position}`);
      }

      console.log(`   ✅ Updated ${updatedCount} players with gross positions`);
    }

    console.log('\n🎉 Gross position migration completed successfully!');

    // Verify the migration
    const remainingNullGrossPositions = await db
      .select()
      .from(playerResults)
      .where(
        and(isNotNull(playerResults.grossScore), eq(playerResults.grossPosition, null as any)),
      );

    if (remainingNullGrossPositions.length === 0) {
      console.log('✅ Verification: No more null gross positions found in valid results');
    } else {
      console.log(
        `⚠️  Warning: Still found ${remainingNullGrossPositions.length} results with null gross positions`,
      );
    }
  } catch (error) {
    console.error('❌ Error during gross position migration:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  migrateGrossPositions()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateGrossPositions };
