import { test, expect } from '@playwright/test';

const testRun = {
  id: 'test-model-high-codex-20260811',
  status: 'benchmark',
  provider: 'Test Provider',
  model: { id: 'test/model-v1', name: 'Test Model', version: 'v1' },
  harness: { name: 'Codex CLI', version: '0.1', interface: 'cli', configuration: 'test', capabilities: ['file editing'] },
  reasoning: { native: 'high', normalized: 'high' },
  run: { completedAt: '2026-08-11T00:00:00Z' },
  dataSource: { type: 'historical-snapshot' },
  artifacts: { displayHtml: 'runs/original/test.html' },
  validation: { passed: true }
};

test('landing page renders the published run index', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Same task/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Run index' })).toBeVisible();
  const headings = isMobile ? ['Model', 'Harness', 'Reasoning'] : ['Model', 'Provider', 'Harness', 'Reasoning', 'Data', 'Validated', 'Run date'];
  for (const heading of headings) {
    await expect(page.getByRole('columnheader', { name: heading })).toBeVisible();
  }
  await expect(page.locator('.run-row').first()).toBeVisible();
  expect(await page.locator('.run-row').count()).toBeGreaterThan(0);
  await expect(page.locator('.run-row').first()).toContainText('gpt-5.4-mini');
  await expect(page.locator('.run-row').first()).toContainText('openai');
});

test('a populated table exposes facets and opens the standalone artifact', async ({ page }) => {
  await page.route('**/data/runs.json', (route) => route.fulfill({ json: { runs: [testRun] } }));
  await page.route('**/runs/original/test.html', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Standalone test artifact</h1>' }));
  await page.goto('/');
  const row = page.locator('.run-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Test Model');
  await expect(row).toContainText('Codex CLI');
  await expect(row).toContainText('High');
  await row.locator('.model-cell a').click();
  await expect(page).toHaveURL(/runs\/original\/test\.html$/);
  await expect(page.getByRole('heading', { name: 'Standalone test artifact' })).toBeVisible();
});

test('mobile table page does not overflow when the index is populated', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile project only');
  await page.goto('/');
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
  await expect(page.getByRole('heading', { name: 'Run index' })).toBeVisible();
});
