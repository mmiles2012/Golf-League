import { db } from './server/db.js';
import { playerResults, tournaments } from './shared/schema.js';
import { eq } from 'drizzle-orm';

// Tour points table for gross scoring (standard tour points regardless of tournament type)
const TOUR_POINTS = [
  500, 300, 190, 145, 120, 100, 85, 75, 67, 60,
  53, 49, 45, 42, 39, 37, 35, 33, 32, 30,
  29, 28, 27, 26, 25, 24, 23, 22, 21, 20,
  19, 18, 17, 16, 15, 14, 13, 12, 11, 10,
  9, 8, 7, 6, 5, 4, 3, 2, 1, 0.5
];

function getPointsForPosition(position: number): number {
  if (position <= 0) return 0;
  if (position <= TOUR_POINTS.length) {
    return TOUR_POINTS[position - 1];
  }
  return 0.5; // Default for positions beyond the table
}

// Calculate average points for tied positions
function calculateTiePoints(startPosition: number, numTiedPlayers: number): number {
  let totalPoints = 0;
  for (let i = 0; i < numTiedPlayers; i++) {
    totalPoints += getPointsForPosition(startPosition + i);
  }
  return totalPoints / numTiedPlayers;
}

async function fixLofotenGrossPointsComplete() {
  try {
    console.log('Starting complete Lofoten Links gross points fix...');

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

    const validResults = results.filter(r => 
      r.grossScore !== null && r.grossScore !== undefined
    );

    console.log(`Processing ${validResults.length} results with gross scores`);

    // Sort by gross score (ascending - lower scores are better)
    validResults.sort((a, b) => (a.grossScore as number) - (b.grossScore as number));

    // Process results to handle ties and assign positions/points
    const processedResults: Array<{
      id: number;
      playerId: number;
      grossScore: number;
      position: number;
      points: number;
    }> = [];

    let currentPosition = 1;
    
    for (let i = 0; i < validResults.length; i++) {
      const currentScore = validResults[i].grossScore as number;
      
      // Find all players with the same score (ties)
      const tiedPlayers = validResults.filter(r => r.grossScore === currentScore);
      const numTiedPlayers = tiedPlayers.length;
      
      // Calculate points for this position (average if tied)
      const points = numTiedPlayers === 1 
        ? getPointsForPosition(currentPosition)
        : calculateTiePoints(currentPosition, numTiedPlayers);

      // Assign position and points to all tied players
      for (const player of tiedPlayers) {
        if (!processedResults.find(p => p.id === player.id)) {
          processedResults.push({
            id: player.id,
            playerId: player.playerId,
            grossScore: player.grossScore as number,
            position: currentPosition,
            points: points
          });
        }
      }

      // Move position forward by number of tied players
      currentPosition += numTiedPlayers;
      
      // Skip ahead in the loop to avoid processing the same tied players again
      while (i + 1 < validResults.length && validResults[i + 1].grossScore === currentScore) {
        i++;
      }
    }

    console.log('Calculated positions and points:');
    processedResults.forEach(result => {
      console.log(`  Player ${result.playerId}: Gross ${result.grossScore}, Position ${result.position}, Points ${result.points}`);
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
      .filter(r => r.grossScore !== null)
      .sort((a, b) => (a.grossScore as number) - (b.grossScore as number))
      .forEach((result, index) => {
        console.log(`  Rank ${index + 1}: Player ${result.playerId}, Gross ${result.grossScore}, Position ${result.grossPosition}, Points ${result.grossPoints}`);
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