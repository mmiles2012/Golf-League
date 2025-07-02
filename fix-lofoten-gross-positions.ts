import { db } from './server/db.js';
import { playerResults, tournaments } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import { TieHandler } from './server/tie-handler.js';

interface PlayerResult {
  id: number;
  playerId: number;
  playerName: string;
  grossScore: number;
  netScore: number;
  handicap: number;
}

// Tour points table for gross scoring (regardless of tournament type)
const TOUR_POINTS = [
  500, 300, 190, 145, 120, 100, 85, 75, 67, 60,
  53, 49, 45, 42, 39, 37, 35, 33, 32, 30,
  29, 28, 27, 26, 25, 24, 23, 22, 21, 20,
  19, 18, 17, 16, 15, 14, 13, 12, 11, 10,
  9, 8, 7, 6, 5, 4, 3, 2, 1, 0.5
];

function calculateGrossPoints(position: number): number {
  if (position <= 0) return 0;
  if (position <= TOUR_POINTS.length) {
    return TOUR_POINTS[position - 1];
  }
  return 0.5; // Default for positions beyond the table
}

async function fixLofotenGrossPositions() {
  try {
    console.log('Starting Lofoten Links gross position and points fix...');

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
        netScore: playerResults.netScore,
        handicap: playerResults.handicap,
      })
      .from(playerResults)
      .where(eq(playerResults.tournamentId, tournamentId));

    const validResults = results.filter(r => 
      r.grossScore !== null && r.grossScore !== undefined
    ) as PlayerResult[];

    console.log(`Processing ${validResults.length} results with gross scores`);

    // Get points configuration for TieHandler
    const pointsConfig = {
      major: { positions: [1000, 800, 650, 520, 400, 320, 260, 215, 180, 150] },
      tour: { positions: TOUR_POINTS },
      league: { positions: [50, 43.75, 37.5, 31.25, 28.13, 25, 21.88, 18.75, 15.63, 12.5] },
      supr: { positions: [25, 21.88, 18.75, 15.63, 14.06, 12.5, 10.94, 9.38, 7.81, 6.25] }
    };

    // Create TieHandler instance and process results
    const tieHandler = new TieHandler(pointsConfig);
    const processedResults = tieHandler.processResultsWithTies(validResults, 'tour', 'gross');

    console.log('Processed results with tie handling:');
    processedResults.forEach(result => {
      console.log(`  ${result.playerId}: Gross ${result.grossScore}, Position ${result.position}, Points ${result.points}`);
    });

    // Update each result with the new gross position and points
    for (const result of processedResults) {
      await db
        .update(playerResults)
        .set({
          grossPosition: result.position,
          grossPoints: result.points,
        })
        .where(eq(playerResults.id, result.id));

      console.log(`Updated result ${result.id}: grossPosition=${result.position}, grossPoints=${result.points}`);
    }

    console.log('✅ Successfully updated all gross positions and points for Lofoten Links');

    // Verify the changes
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

    console.log('\nVerification - Updated results:');
    verification
      .filter(r => r.grossScore !== null)
      .sort((a, b) => (a.grossScore as number) - (b.grossScore as number))
      .forEach((result, index) => {
        console.log(`  Rank ${index + 1}: Player ${result.playerId}, Gross ${result.grossScore}, Position ${result.grossPosition}, Points ${result.grossPoints}`);
      });

  } catch (error) {
    console.error('Error fixing gross positions:', error);
    throw error;
  }
}

// Run the fix
fixLofotenGrossPositions()
  .then(() => {
    console.log('Fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fix failed:', error);
    process.exit(1);
  });