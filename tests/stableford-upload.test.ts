import request from 'supertest';
import { createServer } from 'http';
import express from 'express';
import { registerRoutes } from '../server/routes';
import multer from 'multer';
import XLSX from 'xlsx';
import path from 'path';

describe('Stableford Score Upload Fix', () => {
  let app: express.Express;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    // Setup multer for testing
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }
    });
    
    server = await registerRoutes(app);
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  it('should process Stableford Points file format', async () => {
    // Create test data with Stableford Points column
    const stablefordData = [
      { 
        'Player Name': 'John Smith', 
        'Pos': 1, 
        'Stableford Points': 38, 
        'Playing Handicap': 12, 
        'Email': 'john@example.com' 
      },
      { 
        'Player Name': 'Jane Doe', 
        'Pos': 2, 
        'Stableford Points': 35, 
        'Playing Handicap': 8, 
        'Email': 'jane@example.com' 
      }
    ];

    // Create Excel file
    const ws = XLSX.utils.json_to_sheet(stablefordData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const res = await request(app)
      .post('/api/upload')
      .attach('file', buffer, 'stableford.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('File uploaded successfully');
    expect(res.body.rows).toBe(2); // Should process both rows
    expect(res.body.preview).toHaveLength(2);
    expect(res.body.preview[0].Player).toBe('John Smith');
    expect(res.body.preview[0].Total).toBe(38); // Stableford Points should be mapped to Total
  });

  it('should still process traditional Total column format', async () => {
    // Create test data with traditional Total column
    const strokeData = [
      { 
        'Player Name': 'Bob Wilson', 
        'Pos': 1, 
        'Total': 72, 
        'Course Handicap': 10, 
        'Email': 'bob@example.com' 
      }
    ];

    // Create Excel file
    const ws = XLSX.utils.json_to_sheet(strokeData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const res = await request(app)
      .post('/api/upload')
      .attach('file', buffer, 'stroke.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('File uploaded successfully');
    expect(res.body.rows).toBe(1);
    expect(res.body.preview[0].Total).toBe(72);
  });

  it('should handle Points column format', async () => {
    // Create test data with Points column
    const pointsData = [
      { 
        'Player Name': 'Alice Brown', 
        'Pos': 1, 
        'Points': 42, 
        'Handicap': 15, 
        'Email': 'alice@example.com' 
      }
    ];

    // Create Excel file
    const ws = XLSX.utils.json_to_sheet(pointsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const res = await request(app)
      .post('/api/upload')
      .attach('file', buffer, 'points.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('File uploaded successfully');
    expect(res.body.rows).toBe(1);
    expect(res.body.preview[0].Total).toBe(42);
  });
});