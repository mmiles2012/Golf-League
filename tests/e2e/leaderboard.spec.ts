import { test, expect } from '@playwright/test';

test.describe('Leaderboard Page', () => {
  test('should display leaderboard and player stats', async ({ page }) => {
    await page.goto('http://localhost:3000/leaderboards');
    await expect(page.locator('h1, h2')).toContainText(['Leaderboard', 'Net', 'Gross']);
    await expect(page.locator('table')).toBeVisible();
  });

  test('shows correct tie handling and point averaging', async ({ page }) => {
    // This test assumes a tournament with a 3-way tie for 1st exists in the DB
    await page.goto('http://localhost:3000/leaderboards');
    // Look for T1 (tie for 1st) and check that points are averaged
    const tieRow = page.locator('tr:has-text("T1")');
    await expect(tieRow).toBeVisible();
    // Example: If 3-way tie for 1st in major, each should get (750+400+350)/3 = 500
    await expect(tieRow.locator('td')).toContainText(['500']);
  });
});
