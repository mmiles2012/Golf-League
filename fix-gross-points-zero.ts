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
    // Get the points configuration from database
    const pointsConfig = await storage.getPointsConfig();
    console.log('📊 Retrieved points configuration from database');

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
          grossPoints: playerResults.grossPoints,
        })
        .from(playerResults)
        .where(
          and(
            eq(playerResults.tournamentId, tournament.id),
            eq(playerResults.grossPoints, 0),
            isNotNull(playerResults.grossScore),
          ),
        );

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
          handicap: playerResults.handicap,
        })
        .from(playerResults)
        .where(
          and(eq(playerResults.tournamentId, tournament.id), isNotNull(playerResults.grossScore)),
        );
      const validResults = allTournamentResults.filter(
        (r) => r.grossScore !== null && r.grossScore !== undefined,
      );
      validResults.sort((a, b) => (a.grossScore as number) - (b.grossScore as number));
      const positions = assignPositionsWithTies(validResults, 'grossScore');
      const groups = groupResultsByScore(validResults, 'grossScore');
      const updates: Array<{ id: number; position: number; points: number }> = [];
      let positionCursor = 1;
      for (const group of groups) {
        const numTied = group.players.length;
        const points =
          numTied === 1
            ? getPointsFromConfig(positionCursor, pointsConfig.tour)
            : calculateTiePointsFromTable(positionCursor, numTied, pointsConfig.tour);
        for (const player of group.players) {
          updates.push({ id: player.id, position: positionCursor, points });
        }
        positionCursor += numTied;
      }
      let updatedCount = 0;
      for (const update of updates) {
        if (results.find((r) => r.id === update.id)) {
          await db
            .update(playerResults)
            .set({ grossPosition: update.position, grossPoints: update.points })
            .where(eq(playerResults.id, update.id));
          updatedCount++;
          console.log(
            `   📝 Updated player result ${update.id}: gross position ${update.position}, gross points ${update.points}`,
          );
        }
      }
      console.log(
        `   ✅ Updated ${updatedCount} players with correct gross positions and gross points`,
      );
    }
    console.log('\n🎉 Gross points zero fix completed successfully!');
  } catch (error) {
    console.error('❌ Error during gross points zero fix:', error);
    throw error;
  }
}

// Run the migration
fixGrossPointsZero();

export { fixGrossPointsZero };
