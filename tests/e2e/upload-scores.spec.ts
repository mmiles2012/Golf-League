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
});
