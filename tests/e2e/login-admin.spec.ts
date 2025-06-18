import { test, expect } from '@playwright/test';

test.describe('Admin Login', () => {
  test('should allow admin to log in and see dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('h1, h2')).toContainText(['Dashboard']);
  });
});
