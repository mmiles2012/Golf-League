import { calculatePoints } from '../client/src/lib/points-calculator';
import { DatabaseStorage } from '../server/storage-db';
import type { TournamentType } from '../shared/schema';

describe('calculatePoints (DB-driven)', () => {
  const types: TournamentType[] = ['major', 'tour', 'league', 'supr'];
  let db: DatabaseStorage;
  let pointsConfig: any;

  beforeAll(async () => {
    db = new DatabaseStorage();
    pointsConfig = await db.getPointsConfig();
  });

  it('returns correct points for each type and position from DB config', () => {
    types.forEach(type => {
      const config = pointsConfig[type];
      config.forEach(({ position, points }: { position: number, points: number }) => {
        expect(calculatePoints(position, type)).toBe(points);
      });
    });
  });

  it('returns 0 for out-of-bounds positions', () => {
    expect(calculatePoints(100, 'major')).toBe(0);
    expect(calculatePoints(100, 'tour')).toBe(0);
    expect(calculatePoints(50, 'league')).toBe(0);
  });

  it('returns 0 for invalid/negative positions', () => {
    expect(calculatePoints(0, 'major')).toBe(0);
    expect(calculatePoints(-5, 'tour')).toBe(0);
  });

  it('averages points for ties (e.g., 3-way tie for 1st in major)', () => {
    // Simulate tie: average of 1st, 2nd, 3rd place points
    const tiePositions = [1, 2, 3];
    const points = tiePositions.map(pos => calculatePoints(pos, 'major'));
    const avg = points.reduce((a, b) => a + b, 0) / points.length;
    expect(avg).toBeCloseTo((750 + 400 + 350) / 3);
  });
});

describe('calculatePoints (pure unit)', () => {
  it('returns correct points for known hardcoded values', () => {
    expect(calculatePoints(1, 'major')).toBe(750);
    expect(calculatePoints(2, 'tour')).toBe(300);
    expect(calculatePoints(1, 'league')).toBeCloseTo(93.75);
    expect(calculatePoints(5, 'supr')).toBeCloseTo(37.5);
  });

  it('returns 0 for out-of-bounds positions', () => {
    expect(calculatePoints(100, 'major')).toBe(0);
    expect(calculatePoints(100, 'tour')).toBe(0);
    expect(calculatePoints(50, 'league')).toBe(0);
  });

  it('returns 0 for invalid/negative positions', () => {
    expect(calculatePoints(0, 'major')).toBe(0);
    expect(calculatePoints(-5, 'tour')).toBe(0);
  });

  it('averages points for ties (e.g., 2-way tie for 2nd in tour)', () => {
    const tiePositions = [2, 3];
    const points = tiePositions.map(pos => calculatePoints(pos, 'tour'));
    const avg = points.reduce((a, b) => a + b, 0) / points.length;
    expect(avg).toBeCloseTo((300 + 190) / 2);
  });
});
