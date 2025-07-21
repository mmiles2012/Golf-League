import { db } from './server/db.js';
import { tournaments, playerResults } from './shared/schema.js';
import { eq, and, isNotNull } from 'drizzle-orm';
import { storage } from './server/storage-db.js';

/**
 * Comprehensive audit of tournament points calculations to verify all tournaments
 * use database values rather than hardcoded values for both net and gross scoring
 */

interface TournamentAuditResult {
  tournamentId: number;
  tournamentName: string;
  tournamentType: string;
  totalResults: number;
  netPointsIssues: Array<{
    playerId: number;
    position: number;
    currentPoints: number;
    expectedPoints: number;
  }>;
  grossPointsIssues: Array<{
    playerId: number;
    grossPosition: number;
    currentGrossPoints: number;
    expectedGrossPoints: number;
  }>;
  zeroPointsPositions: Array<{ playerId: number; position: number; type: 'net' | 'gross' }>;
}

async function auditTournamentPoints(): Promise<void> {
  console.log('🔍 Starting comprehensive audit of tournament points calculations...');

  try {
    // Get the points configuration from database
    const pointsConfig = await storage.getPointsConfig();
    console.log('📊 Retrieved points configuration from database');

    // Get all tournaments
    const allTournaments = await db.select().from(tournaments);
    console.log(`Found ${allTournaments.length} tournaments to audit`);

    const auditResults: TournamentAuditResult[] = [];

    for (const tournament of allTournaments) {
      console.log(`\n📊 Auditing tournament: ${tournament.name} (${tournament.type})`);

      // Get all results for this tournament
      const results = await db
        .select()
        .from(playerResults)
        .where(eq(playerResults.tournamentId, tournament.id));

      if (results.length === 0) {
        console.log(`   ⚠️  No results found for ${tournament.name}`);
        continue;
      }

      const auditResult: TournamentAuditResult = {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        tournamentType: tournament.type,
        totalResults: results.length,
        netPointsIssues: [],
        grossPointsIssues: [],
        zeroPointsPositions: [],
      };

      // Check net points against database configuration
      const netPointsTable = pointsConfig[tournament.type as keyof typeof pointsConfig];
      if (netPointsTable && Array.isArray(netPointsTable)) {
        for (const result of results) {
          if (result.position && result.position > 0) {
            const expectedNetPoints = getPointsFromConfig(result.position, netPointsTable);

            // Check for zero points when position should have points
            if (result.points === 0 && expectedNetPoints > 0) {
              auditResult.zeroPointsPositions.push({
                playerId: result.playerId,
                position: result.position,
                type: 'net',
              });
            }

            // Check for mismatched points
            if (result.points !== expectedNetPoints && expectedNetPoints > 0) {
              auditResult.netPointsIssues.push({
                playerId: result.playerId,
                position: result.position,
                currentPoints: result.points || 0,
                expectedPoints: expectedNetPoints,
              });
            }
          }
        }
      }

      // Check gross points - should always use Tour points table regardless of tournament type
      const tourPointsTable = pointsConfig.tour;
      if (tourPointsTable && Array.isArray(tourPointsTable)) {
        for (const result of results) {
          if (result.grossPosition && result.grossPosition > 0) {
            const expectedGrossPoints = getPointsFromConfig(result.grossPosition, tourPointsTable);

            // Check for zero gross points when position should have points
            if (result.grossPoints === 0 && expectedGrossPoints > 0) {
              auditResult.zeroPointsPositions.push({
                playerId: result.playerId,
                position: result.grossPosition,
                type: 'gross',
              });
            }

            // Check for mismatched gross points
            if (result.grossPoints !== expectedGrossPoints && expectedGrossPoints > 0) {
              auditResult.grossPointsIssues.push({
                playerId: result.playerId,
                grossPosition: result.grossPosition,
                currentGrossPoints: result.grossPoints || 0,
                expectedGrossPoints: expectedGrossPoints,
              });
            }
          }
        }
      }

      // Report findings for this tournament
      console.log(`   📊 ${results.length} results processed`);
      if (auditResult.netPointsIssues.length > 0) {
        console.log(`   ⚠️  ${auditResult.netPointsIssues.length} net points mismatches found`);
      }
      if (auditResult.grossPointsIssues.length > 0) {
        console.log(`   ⚠️  ${auditResult.grossPointsIssues.length} gross points mismatches found`);
      }
      if (auditResult.zeroPointsPositions.length > 0) {
        console.log(
          `   ⚠️  ${auditResult.zeroPointsPositions.length} positions with zero points found`,
        );
      }

      auditResults.push(auditResult);
    }

    // Generate summary report
    console.log('\n📋 AUDIT SUMMARY REPORT');
    console.log('========================');

    const totalNetIssues = auditResults.reduce((sum, r) => sum + r.netPointsIssues.length, 0);
    const totalGrossIssues = auditResults.reduce((sum, r) => sum + r.grossPointsIssues.length, 0);
    const totalZeroPointsIssues = auditResults.reduce(
      (sum, r) => sum + r.zeroPointsPositions.length,
      0,
    );

    console.log(`Total tournaments audited: ${auditResults.length}`);
    console.log(`Net points mismatches: ${totalNetIssues}`);
    console.log(`Gross points mismatches: ${totalGrossIssues}`);
    console.log(`Zero points issues: ${totalZeroPointsIssues}`);

    // Detail problematic tournaments
    if (totalNetIssues > 0 || totalGrossIssues > 0 || totalZeroPointsIssues > 0) {
      console.log('\n🔴 TOURNAMENTS WITH ISSUES:');
      for (const result of auditResults) {
        const hasIssues =
          result.netPointsIssues.length > 0 ||
          result.grossPointsIssues.length > 0 ||
          result.zeroPointsPositions.length > 0;

        if (hasIssues) {
          console.log(`\n📊 ${result.tournamentName} (${result.tournamentType})`);

          if (result.netPointsIssues.length > 0) {
            console.log(`   Net points issues: ${result.netPointsIssues.length}`);
            result.netPointsIssues.slice(0, 3).forEach((issue) => {
              console.log(
                `     Player ${issue.playerId} pos ${issue.position}: ${issue.currentPoints} → ${issue.expectedPoints}`,
              );
            });
          }

          if (result.grossPointsIssues.length > 0) {
            console.log(`   Gross points issues: ${result.grossPointsIssues.length}`);
            result.grossPointsIssues.slice(0, 3).forEach((issue) => {
              console.log(
                `     Player ${issue.playerId} gross pos ${issue.grossPosition}: ${issue.currentGrossPoints} → ${issue.expectedGrossPoints}`,
              );
            });
          }

          if (result.zeroPointsPositions.length > 0) {
            console.log(`   Zero points issues: ${result.zeroPointsPositions.length}`);
            result.zeroPointsPositions.slice(0, 3).forEach((issue) => {
              console.log(
                `     Player ${issue.playerId} ${issue.type} pos ${issue.position}: should have points`,
              );
            });
          }
        }
      }
    } else {
      console.log('\n✅ All tournaments use correct database points configuration!');
    }
  } catch (error) {
    console.error('❌ Error during tournament points audit:', error);
  }
}

function getPointsFromConfig(
  position: number,
  pointsTable: Array<{ position: number; points: number }>,
): number {
  const entry = pointsTable.find((p) => p.position === position);
  return entry ? entry.points : 0;
}

// Run the audit
auditTournamentPoints()
  .then(() => {
    console.log('\n🎉 Tournament points audit completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  });
