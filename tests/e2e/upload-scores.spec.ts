import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Score Upload', () => {
  test('admin can upload a tournament score file', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto('http://localhost:3000/upload');
    const filePath = path.resolve(__dirname, '../../attached_assets/Birdie Fest stroke.xlsx');
    await page.setInputFiles('input[type="file"]', filePath);
    await page.click('button:has-text("Upload")');
    await expect(page.locator('text=File uploaded successfully')).toBeVisible();
  });

  test('shows error for missing required columns', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto('http://localhost:3000/upload');
    const filePath = path.resolve(__dirname, '../../attached_assets/invalid_missing_email.xlsx');
    await page.setInputFiles('input[type="file"]', filePath);
    await page.click('button:has-text("Upload")');
    await expect(page.locator('text=Missing email')).toBeVisible();
  });

  test('creates new player if email not found', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto('http://localhost:3000/upload');
    const filePath = path.resolve(__dirname, '../../attached_assets/new_player_upload.xlsx');
    await page.setInputFiles('input[type="file"]', filePath);
    await page.click('button:has-text("Upload")');
    await expect(page.locator('text=File uploaded successfully')).toBeVisible();
    await expect(page.locator('text=New Player')).toBeVisible(); // Assumes 'New Player' is in the uploaded file
  });

  test('validates gross and net score calculation', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto('http://localhost:3000/upload');
    const filePath = path.resolve(__dirname, '../../attached_assets/score_calc_test.xlsx');
    await page.setInputFiles('input[type="file"]', filePath);
    await page.click('button:has-text("Upload")');
    await expect(page.locator('text=File uploaded successfully')).toBeVisible();
    await expect(page.locator('text="Gross Score": 85')).toBeVisible(); // Example gross score
    await expect(page.locator('text="Net Score": 75')).toBeVisible(); // Example net score
  });
});
