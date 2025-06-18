import { test, expect } from '@playwright/test';

test.describe('Leaderboard Page', () => {
  test('should display leaderboard and player stats', async ({ page }) => {
    await page.goto('http://localhost:3000/leaderboards');
    await expect(page.locator('h1, h2')).toContainText(['Leaderboard', 'Net', 'Gross']);
    await expect(page.locator('table')).toBeVisible();
  });
});
