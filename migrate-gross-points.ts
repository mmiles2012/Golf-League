import { db } from './server/db.js';
import { playerResults, tournaments } from './shared/schema.js';
import { eq, isNull } from 'drizzle-orm';

// Points calculation based on gross position
function calculateGrossPoints(position: number): number {
  const tourPoints = [
    500, 300, 190, 135, 110, 100, 90, 85, 80, 75,    // 1-10
    70, 65, 60, 55, 53, 51, 49, 47, 45, 43,          // 11-20
    41, 39, 37, 35.5, 34, 32.5, 31, 29.5, 28, 26.5, // 21-30
    25, 23.5, 22, 21, 20, 19, 18, 17, 16, 15,        // 31-40
    14, 13, 12, 11, 10.5, 10, 9.5, 9, 8.5, 8,       // 41-50
  ];
  
  return position <= 50 ? tourPoints[position - 1] : 
         position <= 51 ? 7.5 :
         position <= 52 ? 7 :
         position <= 53 ? 6.5 :
         position <= 54 ? 6 :
         position <= 55 ? 5.8 :
         position <= 56 ? 5.6 :
         position <= 57 ? 5.4 :
         position <= 58 ? 5.2 :
         position <= 59 ? 5 :
         position <= 60 ? 4.8 :
         position <= 61 ? 4.6 :
         position <= 62 ? 4.4 :
         position <= 63 ? 4.2 :
         position <= 64 ? 4 : 3.8;
}

async function migrateGrossPoints() {
  try {
    console.log('Starting gross points migration...');
    
    // Get all tournaments
    const allTournaments = await db.select().from(tournaments);
    
    for (const tournament of allTournaments) {
      console.log(`Processing tournament: ${tournament.name}`);
      
      // Get all results for this tournament that don't have gross points
      const results = await db.select()
        .from(playerResults)
        .where(eq(playerResults.tournamentId, tournament.id));
      
      // Filter and sort by gross score to determine positions
      const validResults = results
        .filter(r => r.grossScore !== null)
        .sort((a, b) => (a.grossScore || 999) - (b.grossScore || 999));
      
      // Update each result with calculated gross points
      for (let i = 0; i < validResults.length; i++) {
        const result = validResults[i];
        const grossPosition = i + 1;
        const grossPoints = calculateGrossPoints(grossPosition);
        
        await db.update(playerResults)
          .set({ grossPoints })
          .where(eq(playerResults.id, result.id));
        
        console.log(`Updated ${result.id}: position ${grossPosition}, gross points ${grossPoints}`);
      }
    }
    
    console.log('Gross points migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateGrossPoints();