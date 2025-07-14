import { db } from './db';
import { tournaments, playerResults, players } from '../shared/schema';
import { eq, inArray, and, isNotNull } from 'drizzle-orm';
import { getPointsFromConfig } from './migration-utils';
import { calculateGrossPoints } from './gross-points-utils';
import type { PointsConfig } from '../shared/schema';

export type RecalcMode = 'gross' | 'net' | 'both';
export type RecalcType = 'tour' | 'major' | 'league' | 'supr' | 'all';

export interface RecalcLogEntry {
  timestamp: string;
  action: string;
  details: any;
}

// In-memory log store for demo; replace with persistent storage in production
export const recalculationLogs: RecalcLogEntry[] = [];

export class RecalculationService {
  private pointsConfig: PointsConfig;
  private logs: RecalcLogEntry[] = [];

  constructor(pointsConfig: PointsConfig) {
    this.pointsConfig = pointsConfig;
  }

  getLogs() {
    return this.logs;
  }

  log(action: string, details: any) {
    const entry = { timestamp: new Date().toISOString(), action, details };
    this.logs.push(entry);
    recalculationLogs.push(entry);
    if (recalculationLogs.length > 200) recalculationLogs.shift();
    console.log(`[RECALC] ${action}:`, details);
  }

  async recalculateAllTournaments({ type, mode }: { type?: RecalcType, mode: RecalcMode }) {
    const where = type && type !== 'all' ? eq(tournaments.type, type) : undefined;
    const allTournaments = await db.select().from(tournaments).where(where || undefined);
    for (const t of allTournaments) {
      await this.recalculateTournament({ tournamentId: t.id, mode });
    }
    this.log('recalculateAllTournaments', { type, mode, count: allTournaments.length });
  }

  async recalculateTournament({ tournamentId, mode }: { tournamentId: number, mode: RecalcMode }) {
    const tournament = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)))[0];
    if (!tournament) throw new Error('Tournament not found');
    const results = await db.select().from(playerResults).where(eq(playerResults.tournamentId, tournamentId));
    if (mode === 'gross' || mode === 'both') {
      await this.recalculateResults(results, tournament, 'gross');
    }
    if (mode === 'net' || mode === 'both') {
      await this.recalculateResults(results, tournament, 'net');
    }
    this.log('recalculateTournament', { tournamentId, mode });
  }

  async recalculatePlayer({ playerId, mode }: { playerId: number, mode: RecalcMode }) {
    const results = await db.select().from(playerResults).where(eq(playerResults.playerId, playerId));
    for (const result of results) {
      const tournament = (await db.select().from(tournaments).where(eq(tournaments.id, result.tournamentId)))[0];
      if (!tournament) continue;
      if (mode === 'gross' || mode === 'both') {
        await this.recalculateResults([result], tournament, 'gross');
      }
      if (mode === 'net' || mode === 'both') {
        await this.recalculateResults([result], tournament, 'net');
      }
    }
    this.log('recalculatePlayer', { playerId, mode });
  }

  private async recalculateResults(results: any[], tournament: any, mode: 'gross' | 'net') {
    // Sort and handle ties for gross/net
    const scoreField = mode === 'gross' ? 'grossScore' : 'netScore';
    const pointsField = mode === 'gross' ? 'grossPoints' : 'points';
    const positionField = mode === 'gross' ? 'grossPosition' : 'position';
    const validResults = results.filter(r => r[scoreField] !== null && r[scoreField] !== undefined);
    validResults.sort((a, b) => a[scoreField] - b[scoreField]);
    let currentPosition = 1;
    for (let i = 0; i < validResults.length; i++) {
      const currentScore = validResults[i][scoreField];
      const tiedPlayers = validResults.filter(r => r[scoreField] === currentScore);
      const numTied = tiedPlayers.length;
      // Average points for ties
      let points = 0;
      if (mode === 'gross') {
        points = numTied === 1
          ? calculateGrossPoints(currentPosition, tournament.type, this.pointsConfig)
          : (() => {
              let total = 0;
              for (let j = 0; j < numTied; j++) {
                total += calculateGrossPoints(currentPosition + j, tournament.type, this.pointsConfig);
              }
              return total / numTied;
            })();
      } else {
        const netPointsTable = this.pointsConfig[tournament.type as keyof PointsConfig];
        points = numTied === 1
          ? getPointsFromConfig(currentPosition, netPointsTable)
          : (() => {
              let total = 0;
              for (let j = 0; j < numTied; j++) {
                total += getPointsFromConfig(currentPosition + j, netPointsTable);
              }
              return total / numTied;
            })();
      }
      // Update all tied players
      for (const player of tiedPlayers) {
        await db.update(playerResults)
          .set({ [positionField]: currentPosition, [pointsField]: points })
          .where(eq(playerResults.id, player.id));
        this.log('updateResult', { id: player.id, [positionField]: currentPosition, [pointsField]: points });
      }
      currentPosition += numTied;
      while (i + 1 < validResults.length && validResults[i + 1][scoreField] === currentScore) {
        i++;
      }
    }
  }
}
