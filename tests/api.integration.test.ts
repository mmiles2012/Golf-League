import request from 'supertest';
import { app } from '../server/index';

describe('API Integration', () => {
  it('GET /api/leaderboard/net returns leaderboard', async () => {
    const res = await request(app).get('/api/leaderboard/net');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/tournaments/manual-entry creates a tournament', async () => {
    const payload = {
      name: 'Integration Test Event',
      date: new Date().toISOString(),
      type: 'league',
      results: [
        { playerName: 'Test Player', position: 1, grossScore: 80, netScore: 70, handicap: 10 }
      ]
    };
    const res = await request(app)
      .post('/api/tournaments/manual-entry')
      .send(payload);
    expect([200, 201]).toContain(res.status);
    expect(res.body.tournament).toBeDefined();
  });
});
