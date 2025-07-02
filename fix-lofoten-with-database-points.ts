import { db } from './server/db.js';
import { playerResults, tournaments } from './shared/schema.js';
import { eq } from 'drizzle-orm';

// Fetch actual tour points from database API
async function fetchTourPoints() {
  const response = await fetch('http://localhost:5000/api/points-config');
  const pointsConfig = await response.json();
  return pointsConfig.tour.map((p: any) => p.points);
}

function calculateTiePoints(startPosition: number, numTiedPlayers: number, tourPoints: number[]): number {
  let totalPoints = 0;
  for (let i = 0; i < numTiedPlayers; i++) {
    const position = startPosition + i;
    if (position <= tourPoints.length) {
      totalPoints += tourPoints[position - 1]; // Arrays are 0-indexed, positions are 1-indexed
    }
  }
  return totalPoints / numTiedPlayers;
}

async function fixLofotenWithDatabasePoints() {
  try {
    console.log('Fetching actual tour points from database...');
    const tourPoints = await fetchTourPoints();
    console.log('Database tour points (positions 1-10):', tourPoints.slice(0, 10));
    
    // Verify the T5 calculation
    const t5Points = tourPoints.slice(4, 9); // Positions 5-9 (0-indexed)
    console.log('T5 positions 5-9 points:', t5Points);
    const t5Average = t5Points.reduce((sum, points) => sum + points, 0) / 5;
    console.log('T5 average points:', t5Average);

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
      
      // Calculate points for this position using actual database values
      const points = numTiedPlayers === 1 
        ? (currentPosition <= tourPoints.length ? tourPoints[currentPosition - 1] : 0.5)
        : calculateTiePoints(currentPosition, numTiedPlayers, tourPoints);

      console.log(`Position ${currentPosition}, ${numTiedPlayers} tied players, points: ${points}`);

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

    console.log('\nCalculated positions and points:');
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

    console.log('✅ Successfully updated all gross positions and points with correct database values');

    // Verification - check the T5 tie specifically
    const t5Verification = await db
      .select({
        playerId: playerResults.playerId,
        grossScore: playerResults.grossScore,
        grossPosition: playerResults.grossPosition,
        grossPoints: playerResults.grossPoints,
      })
      .from(playerResults)
      .where(eq(playerResults.tournamentId, tournamentId));

    const t5Players = t5Verification.filter(r => r.grossScore === 70);
    console.log('\nT5 verification (gross score 70):');
    t5Players.forEach(player => {
      console.log(`  Player ${player.playerId}: Position ${player.grossPosition}, Points ${player.grossPoints}`);
    });

  } catch (error) {
    console.error('Error fixing gross points:', error);
    throw error;
  }
}

// Run the fix
fixLofotenWithDatabasePoints()
  .then(() => {
    console.log('Fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fix failed:', error);
    process.exit(1);
  });