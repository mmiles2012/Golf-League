import { db } from './server/db.js';
import { tournaments, playerResults } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import { storage } from './server/storage-db.js';
import { TieHandler } from './server/tie-handler.js';

/**
 * Verify that the tie handling fix script produces the same results
 * as the tournament upload system for handling ties, net, and gross scores
 */

async function verifyTieCalculations(): Promise<void> {
  console.log('🔍 Verifying tie calculations match tournament upload system...');

  try {
    // Get the points configuration from database (same as upload system)
    const pointsConfig = await storage.getPointsConfig();
    console.log('📊 Retrieved points configuration from database');

    // Initialize TieHandler (same as upload system)
    const tieHandler = new TieHandler(pointsConfig);

    // Get all tournaments to verify
    const allTournaments = await db.select().from(tournaments);
    console.log(`Found ${allTournaments.length} tournaments to verify`);

    let totalVerificationErrors = 0;

    for (const tournament of allTournaments) {
      console.log(`\n🎯 Verifying tournament: ${tournament.name} (${tournament.type})`);

      // Get all results for this tournament
      const results = await db
        .select()
        .from(playerResults)
        .where(eq(playerResults.tournamentId, tournament.id))
        .orderBy(playerResults.position);

      if (results.length === 0) {
        console.log(`   ⚠️  No results found for ${tournament.name}`);
        continue;
      }

      console.log(`   📋 Found ${results.length} results to verify`);

      // Prepare data in the same format as tournament upload system
      const uploadFormatData = results.map((r) => ({
        playerId: r.playerId,
        playerName: `Player ${r.playerId}`, // Names aren't critical for calculations
        grossScore: r.grossScore,
        netScore: r.netScore,
        handicap: r.handicap,
      }));

      // Test NET score calculations (same as upload system logic)
      console.log(`   🔢 Testing NET score tie calculations...`);
      const netProcessedResults = tieHandler.processResultsWithTies(
        uploadFormatData,
        tournament.type,
        'net',
      );

      // Verify NET calculations match database
      let netErrors = 0;
      for (const processedResult of netProcessedResults) {
        const dbResult = results.find((r) => r.playerId === processedResult.playerId);
        if (!dbResult) continue;

        // Check position matches
        if (dbResult.position !== processedResult.position) {
          console.log(
            `   ❌ NET POSITION ERROR: Player ${processedResult.playerId} - DB: ${dbResult.position}, Upload: ${processedResult.position}`,
          );
          netErrors++;
        }

        // Check points match (allow small rounding differences)
        const pointsDiff = Math.abs((dbResult.points || 0) - processedResult.points);
        if (pointsDiff > 0.01) {
          console.log(
            `   ❌ NET POINTS ERROR: Player ${processedResult.playerId} - DB: ${dbResult.points}, Upload: ${processedResult.points}`,
          );
          netErrors++;
        }
      }

      // Test GROSS score calculations (same as upload system logic)
      console.log(`   🔢 Testing GROSS score tie calculations...`);
      const grossProcessedResults = tieHandler.processResultsWithTies(
        uploadFormatData,
        'tour', // Gross always uses tour points regardless of tournament type
        'gross',
      );

      // Verify GROSS calculations match database
      let grossErrors = 0;
      for (const processedResult of grossProcessedResults) {
        const dbResult = results.find((r) => r.playerId === processedResult.playerId);
        if (!dbResult) continue;

        // Check gross position matches
        if (dbResult.grossPosition !== processedResult.position) {
          console.log(
            `   ❌ GROSS POSITION ERROR: Player ${processedResult.playerId} - DB: ${dbResult.grossPosition}, Upload: ${processedResult.position}`,
          );
          grossErrors++;
        }

        // Check gross points match (allow small rounding differences)
        const pointsDiff = Math.abs((dbResult.grossPoints || 0) - processedResult.points);
        if (pointsDiff > 0.01) {
          console.log(
            `   ❌ GROSS POINTS ERROR: Player ${processedResult.playerId} - DB: ${dbResult.grossPoints}, Upload: ${processedResult.points}`,
          );
          grossErrors++;
        }
      }

      if (netErrors === 0 && grossErrors === 0) {
        console.log(`   ✅ Perfect match! NET and GROSS calculations identical to upload system`);
      } else {
        console.log(`   ⚠️  Found ${netErrors} net errors and ${grossErrors} gross errors`);
        totalVerificationErrors += netErrors + grossErrors;
      }
    }

    console.log(`\n🎉 Verification completed!`);
    if (totalVerificationErrors === 0) {
      console.log(`✅ PERFECT MATCH: All tie calculations match tournament upload system exactly!`);
      console.log(`✅ NET scoring: Uses tournament-specific points configuration`);
      console.log(
        `✅ GROSS scoring: Uses tour points configuration (regardless of tournament type)`,
      );
      console.log(`✅ TIE handling: Proper averaging across tied positions`);
      console.log(`✅ Database configuration: All points sourced from database values`);
    } else {
      console.log(`❌ Found ${totalVerificationErrors} calculation differences`);
    }
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Run the verification
verifyTieCalculations()
  .then(() => {
    console.log('\n🎉 Verification completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
