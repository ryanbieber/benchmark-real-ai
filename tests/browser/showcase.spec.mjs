import { test, expect } from '@playwright/test';

test('landing page presents the premise and four disclosed demo runs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Claims are cheap/i })).toBeVisible();
  await expect(page.locator('.run-card')).toHaveCount(4);
  await expect(page.getByText('UI DEMO · NOT BENCHMARK')).toHaveCount(4);
  await expect(page.getByText('DEMO DATA')).toBeVisible();
});

test('filters and guided selection work', async ({ page }) => {
  await page.goto('/#explorer');
  await page.locator('#filter-reasoning').selectOption('high');
  await expect(page.locator('.run-card')).toHaveCount(1);
  await page.getByRole('button', { name: /Add to walkthrough/ }).click();
  await expect(page.locator('#selection-count')).toHaveText('1');
  await page.locator('#clear-filters').click();
  await page.locator('.run-card').nth(2).getByRole('button', { name: /Add to walkthrough/ }).click();
  await page.locator('#start-walkthrough').click();
  await expect(page).toHaveURL(/compare\.html\?runs=/);
  await expect(page.locator('#run-title')).toContainText('Atlas Demo');
  await expect(page.frameLocator('#artifact-frame').getByText(/DEMO FIXTURE/)).toBeVisible();
  await page.locator('#next-run').click();
  await expect(page.locator('#progress-label')).toHaveText('Run 2 of 2');
});

test('two selected runs can be viewed side by side', async ({ page }) => {
  await page.goto('/compare.html?runs=demo-atlas-low,demo-meridian-max');
  await page.locator('#compare-toggle').click();
  await expect(page.locator('#frame-grid')).toHaveClass(/split/);
  await expect(page.locator('#secondary-frame-wrap')).toBeVisible();
  await expect(page.frameLocator('#secondary-frame').getByText(/DEMO FIXTURE/)).toBeVisible();
});

test('mobile layout does not overflow the viewport', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile project only');
  await page.goto('/');
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
  await expect(page.getByRole('link', { name: /Explore the runs/ })).toBeVisible();
});
