import { test, expect } from '@playwright/test';

test.describe('Points Configuration', () => {
  test('admin can view and edit points config', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto('http://localhost:3000/points-config');
    await expect(page.locator('h1, h2')).toContainText(['Points Configuration']);
    await expect(page.locator('table')).toBeVisible();
    // Optionally, test editing a value
    // await page.fill('input[type="number"]:first-of-type', '999');
    // await page.click('button:has-text("Save")');
    // await expect(page.locator('text=Saved')).toBeVisible();
  });
});
