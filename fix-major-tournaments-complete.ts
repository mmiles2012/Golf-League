import { db } from './server/db';
import { playerResults, tournaments } from './shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import {
  getPointsFromConfig,
  assignPositionsWithTies,
  groupResultsByScore,
  calculateTiePointsFromTable,
} from './server/migration-utils';
import { storage } from './server/storage-db';

async function fixMajorTournamentsComplete() {
  console.log('🔧 Starting complete major tournament fix (gross positions + gross points)...');

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
          grossPoints: playerResults.grossPoints,
        })
        .from(playerResults)
        .where(
          and(eq(playerResults.tournamentId, tournament.id), isNotNull(playerResults.grossScore)),
        );

      if (results.length === 0) {
        console.log(`   ⚠️  No results found for tournament ${tournament.name}`);
        continue;
      }

      console.log(`   🎯 Found ${results.length} results to fix`);

      // Sort by gross score (ascending)
      const sortedResults = [...results].sort(
        (a, b) => (a.grossScore || 999) - (b.grossScore || 999),
      );
      // Assign positions with tie handling
      const positions = assignPositionsWithTies(sortedResults, 'grossScore');
      // Group by score for tie handling
      const groups = groupResultsByScore(sortedResults, 'grossScore');
      // Prepare updates
      const updates: Array<{ id: number; position: number; points: number }> = [];
      let positionCursor = 1;
      for (const group of groups) {
        const numTied = group.players.length;
        const points =
          numTied === 1
            ? getPointsFromConfig(positionCursor, pointsConfig.major)
            : calculateTiePointsFromTable(positionCursor, numTied, pointsConfig.major);
        for (const player of group.players) {
          updates.push({ id: player.id, position: positionCursor, points });
        }
        positionCursor += numTied;
      }
      // Update both gross position and gross points using major points table
      let updatedCount = 0;
      for (const update of updates) {
        await db
          .update(playerResults)
          .set({ grossPosition: update.position, grossPoints: update.points })
          .where(eq(playerResults.id, update.id));
        updatedCount++;
        console.log(
          `   📝 Updated player result ${update.id}: gross position ${update.position}, major gross points ${update.points}`,
        );
      }
      console.log(
        `   ✅ Updated ${updatedCount} players with correct gross positions and major gross points`,
      );
    }
    console.log('\n🎉 Complete major tournament fix completed successfully!');
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
    .catch((error) => {
      console.error('Complete fix failed:', error);
      process.exit(1);
    });
}

export { fixMajorTournamentsComplete };
