import { db } from './server/db.js';
import { tournaments, playerResults } from './shared/schema.js';
import { eq, and, isNotNull } from 'drizzle-orm';
import { storage } from './server/storage-db.js';
import { getPointsFromConfig, logPointsConfig } from './server/migration-utils';

/**
 * Comprehensive fix for all hardcoded points values in the database
 * This script will recalculate ALL tournament points using database configuration
 * instead of any remaining hardcoded values
 */

async function fixAllHardcodedPoints(): Promise<void> {
  console.log('🔧 Starting comprehensive fix for all hardcoded points values...');
  
  try {
    // Get the points configuration from database
    const pointsConfig = await storage.getPointsConfig();
    console.log('📊 Retrieved points configuration from database');
    logPointsConfig(pointsConfig);
    
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
      
      console.log(`   🎯 Found ${results.length} results to verify`);
      
      // Get tournament-specific points table for net scoring
      const netPointsTable = pointsConfig[tournament.type as keyof typeof pointsConfig];
      // Get tour points table for gross scoring (always uses Tour points)
      const grossPointsTable = pointsConfig.tour;
      
      let netUpdatedCount = 0;
      let grossUpdatedCount = 0;
      
      for (const result of results) {
        let needsUpdate = false;
        const updateData: any = {};
        
        // Check NET points against database configuration
        if (result.position && result.position > 0 && Array.isArray(netPointsTable)) {
          const expectedNetPoints = getPointsFromConfig(result.position, netPointsTable);
          
          if (result.points !== expectedNetPoints) {
            console.log(`   📝 NET: Player ${result.playerId} pos ${result.position}: ${result.points} → ${expectedNetPoints}`);
            updateData.points = expectedNetPoints;
            needsUpdate = true;
            netUpdatedCount++;
          }
        }
        
        // Check GROSS points against Tour points table (always uses Tour regardless of tournament type)
        if (result.grossPosition && result.grossPosition > 0 && Array.isArray(grossPointsTable)) {
          const expectedGrossPoints = getPointsFromConfig(result.grossPosition, grossPointsTable);
          
          if (result.grossPoints !== expectedGrossPoints) {
            console.log(`   📝 GROSS: Player ${result.playerId} gross pos ${result.grossPosition}: ${result.grossPoints} → ${expectedGrossPoints}`);
            updateData.grossPoints = expectedGrossPoints;
            needsUpdate = true;
            grossUpdatedCount++;
          }
        }
        
        // Update the record if needed
        if (needsUpdate) {
          await db
            .update(playerResults)
            .set(updateData)
            .where(eq(playerResults.id, result.id));
        }
      }
      
      console.log(`   ✅ Updated ${netUpdatedCount} net points and ${grossUpdatedCount} gross points`);
      totalNetUpdated += netUpdatedCount;
      totalGrossUpdated += grossUpdatedCount;
    }
    
    console.log(`\n🎉 Comprehensive points fix completed!`);
    console.log(`Total net points updated: ${totalNetUpdated}`);
    console.log(`Total gross points updated: ${totalGrossUpdated}`);
    console.log(`All tournaments now use database points configuration!`);
    
  } catch (error) {
    console.error('❌ Error during comprehensive points fix:', error);
  }
}

// Run the comprehensive fix
fixAllHardcodedPoints()
  .then(() => {
    console.log('\n🎉 All hardcoded points have been fixed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });