import { db } from './server/db.js';
import { playerResults, tournaments } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import {
  getPointsFromConfig,
  calculateTiePointsFromTable,
  assignPositionsWithTies,
  groupResultsByScore,
} from './server/migration-utils';
import { storage } from './server/storage-db.js';

async function fixLofotenGrossPointsComplete() {
  try {
    console.log('Starting complete Lofoten Links gross points fix...');
    // Get the points configuration from database
    const pointsConfig = await storage.getPointsConfig();
    const tourPointsTable = pointsConfig.tour;

    // Get the Lofoten tournament
    const tournament = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.name, 'Tour Event #2  - Lofoten Links'))
      .limit(1);

    if (tournament.length === 0) {
      console.log('Tournament not found');
      return;
    }

    const tournamentId = tournament[0].id;
    console.log(`Found tournament: ${tournament[0].name} (ID: ${tournamentId})`);

    // Get all results for this tournament with valid gross scores
    const results = await db
      .select({
        id: playerResults.id,
        playerId: playerResults.playerId,
        grossScore: playerResults.grossScore,
      })
      .from(playerResults)
      .where(eq(playerResults.tournamentId, tournamentId));

    const validResults = results.filter((r) => r.grossScore !== null && r.grossScore !== undefined);

    console.log(`Processing ${validResults.length} results with gross scores`);

    // Sort by gross score (ascending - lower scores are better)
    validResults.sort((a, b) => (a.grossScore as number) - (b.grossScore as number));

    // Assign positions with tie handling
    const positions = assignPositionsWithTies(validResults, 'grossScore');

    // Group by score for tie handling
    const groups = groupResultsByScore(validResults, 'grossScore');

    // Prepare updates
    const updates: Array<{ id: number; position: number; points: number }> = [];
    let currentPosition = 1;
    for (const group of groups) {
      const numTied = group.players.length;
      const points =
        numTied === 1
          ? getPointsFromConfig(currentPosition, tourPointsTable)
          : calculateTiePointsFromTable(currentPosition, numTied, tourPointsTable);
      for (const player of group.players) {
        updates.push({ id: player.id, position: currentPosition, points });
      }
      currentPosition += numTied;
    }

    // Update each result with the new gross position and points
    for (const update of updates) {
      await db
        .update(playerResults)
        .set({
          grossPosition: update.position,
          grossPoints: update.points,
        })
        .where(eq(playerResults.id, update.id));
      console.log(
        `Updated result ${update.id}: grossPosition=${update.position}, grossPoints=${update.points}`,
      );
    }

    console.log('✅ Successfully updated all gross positions and points for Lofoten Links');

    // Verification
    const verification = await db
      .select({
        id: playerResults.id,
        playerId: playerResults.playerId,
        grossScore: playerResults.grossScore,
        grossPosition: playerResults.grossPosition,
        grossPoints: playerResults.grossPoints,
      })
      .from(playerResults)
      .where(eq(playerResults.tournamentId, tournamentId));

    console.log('\nVerification - Final results:');
    verification
      .filter((r) => r.grossScore !== null)
      .sort((a, b) => (a.grossScore as number) - (b.grossScore as number))
      .forEach((result, index) => {
        console.log(
          `  Rank ${index + 1}: Player ${result.playerId}, Gross ${result.grossScore}, Position ${result.grossPosition}, Points ${result.grossPoints}`,
        );
      });
  } catch (error) {
    console.error('Error fixing gross points:', error);
    throw error;
  }
}

// Run the fix
fixLofotenGrossPointsComplete()
  .then(() => {
    console.log('Fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fix failed:', error);
    process.exit(1);
  });
