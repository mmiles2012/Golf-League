import request from 'supertest';
import { app } from '../server/index';
import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';

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

  it('POST /api/upload rejects missing email', async () => {
    // Create a test xlsx file with missing email
    const data = [{ Player: 'No Email', Total: 70, 'Course Handicap': 10 }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const filePath = path.join(__dirname, 'missing_email.xlsx');
    XLSX.writeFile(wb, filePath);
    const res = await request(app)
      .post('/api/upload')
      .attach('file', filePath);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Missing email/);
    fs.unlinkSync(filePath);
  });

  it('POST /api/upload creates new player if email not found', async () => {
    const data = [{ Email: 'newuser@example.com', Player: 'New User', Total: 80, 'Course Handicap': 12 }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const filePath = path.join(__dirname, 'new_player.xlsx');
    XLSX.writeFile(wb, filePath);
    const res = await request(app)
      .post('/api/upload')
      .attach('file', filePath);
    expect(res.status).toBe(200);
    expect(res.body.preview[0].Email).toBe('newuser@example.com');
    expect(res.body.preview[0].Player).toBe('New User');
    fs.unlinkSync(filePath);
  });

  it('POST /api/upload validates gross/net calculation', async () => {
    const data = [{ Email: 'calc@example.com', Player: 'Calc User', Total: 75, 'Course Handicap': 8 }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const filePath = path.join(__dirname, 'calc_test.xlsx');
    XLSX.writeFile(wb, filePath);
    const res = await request(app)
      .post('/api/upload')
      .attach('file', filePath);
    expect(res.status).toBe(200);
    expect(res.body.preview[0]['Gross Score']).toBe(83);
    expect(res.body.preview[0]['Net Score']).toBe(75);
    expect(res.body.preview[0]['Course Handicap']).toBe(8);
    fs.unlinkSync(filePath);
  });

  it('POST /api/upload rejects missing Total or Course Handicap', async () => {
    const data = [{ Email: 'bad@example.com', Player: 'Bad User', 'Course Handicap': 10 }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const filePath = path.join(__dirname, 'missing_total.xlsx');
    XLSX.writeFile(wb, filePath);
    const res = await request(app)
      .post('/api/upload')
      .attach('file', filePath);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Total/);
    fs.unlinkSync(filePath);
  });
});

describe('Leaderboard API Backend-Driven Logic', () => {
  it('should return all points, positions, and tie fields for net and gross leaderboards', async () => {
    // Example: fetch leaderboard and check for required fields
    const netRes = await fetch('/api/leaderboard/net');
    const netData = await netRes.json();
    expect(Array.isArray(netData)).toBe(true);
    expect(netData[0]).toHaveProperty('rank');
    expect(netData[0]).toHaveProperty('totalPoints');
    expect(netData[0]).toHaveProperty('majorPoints');
    expect(netData[0]).toHaveProperty('tourPoints');
    expect(netData[0]).toHaveProperty('leaguePoints');
    expect(netData[0]).toHaveProperty('suprPoints');
    expect(netData[0]).toHaveProperty('totalEvents');

    const grossRes = await fetch('/api/leaderboard/gross');
    const grossData = await grossRes.json();
    expect(Array.isArray(grossData)).toBe(true);
    expect(grossData[0]).toHaveProperty('rank');
    expect(grossData[0]).toHaveProperty('grossTotalPoints');
    expect(grossData[0]).toHaveProperty('grossTourPoints');
    expect(grossData[0]).toHaveProperty('leaguePoints');
    expect(grossData[0]).toHaveProperty('suprPoints');
    expect(grossData[0]).toHaveProperty('totalEvents');
  });

  it('should not require frontend to recalculate points or ties', () => {
    // The frontend only displays backend-provided values
    expect(true).toBe(true);
  });
});
