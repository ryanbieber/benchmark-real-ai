import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const manifest = JSON.parse(readFileSync(new URL('../../data/runs.json', import.meta.url), 'utf8'));
const publishedRuns = manifest.runs.filter((run) => run.status === 'benchmark');

const testRun = {
  id: 'test-model-high-codex-20260811',
  status: 'benchmark',
  provider: 'Test Provider',
  model: { id: 'test/model-v1', name: 'Test Model', version: 'v1' },
  harness: { name: 'Codex CLI', version: '0.1', interface: 'cli', configuration: 'test', capabilities: ['file editing'] },
  reasoning: { native: 'high', normalized: 'high' },
  timestamps: { startedAt: '2026-08-11T00:00:00Z', finishedAt: '2026-08-11T00:01:05Z', durationSeconds: 65 },
  usage: { inputTokens: 1000, cachedInputTokens: 400, outputTokens: 200, reasoningOutputTokens: 50, totalTokens: 1200, source: 'test' },
  run: { completedAt: '2026-08-11T00:00:00Z' },
  dataSource: { type: 'historical-snapshot' },
  artifacts: { displayHtml: 'runs/original/test.html' },
  validation: { passed: true }
};

test('landing page renders the published run index', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Same task/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Run index' })).toBeVisible();
  for (const heading of ['Model', 'Harness', 'Reasoning level', 'Input', 'Cached', 'Output', 'Reasoning tokens', 'Total', 'Time', 'Est. cost']) await expect(page.getByRole('columnheader', { name: heading, exact: true })).toBeVisible();
  await expect(page.locator('.run-row')).toHaveCount(publishedRuns.length);
  await expect(page.locator('#result-count')).toContainText(`${publishedRuns.length}`);
  await expect(page.locator('.run-row').first()).toContainText(publishedRuns[0].model.name);
  await expect(page.locator('#run-table-body')).toContainText(publishedRuns.at(-1).model.name);
  await expect(page.locator('.run-row').first()).toContainText('238,545');
  await expect(page.locator('.run-row').first()).toContainText('197,888');
  await expect(page.locator('.run-row').first()).toContainText('25,418');
  await expect(page.locator('.run-row').first()).toContainText('6m 59s');
  await expect(page.getByRole('heading', { name: /What each run would cost/i })).toBeVisible();
  await expect(page.locator('.cost-row')).toHaveCount(publishedRuns.length);
  await expect(page.locator('#combined-cost')).toHaveText('$6.31');
  await expect(page.locator('#pricing-note')).toContainText('not actual Codex subscription charges');
});

test('a populated table exposes facets, usage, cost, and opens the standalone artifact', async ({ page, isMobile }) => {
  const pricing = { currency: 'USD', unitTokens: 1_000_000, serviceTier: 'standard', contextBand: 'short', retrievedAt: '2026-08-12', source: 'https://developers.openai.com/api/docs/pricing/', models: { 'test/model-v1': { inputUsd: 0.75, cachedInputUsd: 0.075, outputUsd: 4.5 } } };
  await page.route('**/data/runs.json', (route) => route.fulfill({ json: { benchmark: { pricing }, runs: [testRun] } }));
  await page.route('**/runs/original/test.html', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Standalone test artifact</h1>' }));
  await page.goto('/');
  const row = page.locator('.run-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Test Model');
  await expect(row).toContainText('Codex CLI');
  await expect(row).toContainText('High');
  await expect(row).toContainText('1,000');
  await expect(row).toContainText('400');
  await expect(row).toContainText('200');
  await expect(row).toContainText('50');
  await expect(row).toContainText('1m 05s');
  await expect(row).toContainText('$0.0014');
  if (isMobile) await row.press('Enter');
  else await row.locator('.model-cell a').click();
  await expect(page).toHaveURL(/runs\/original\/test\.html$/);
  await expect(page.getByRole('heading', { name: 'Standalone test artifact' })).toBeVisible();
});

test('mobile table page does not overflow when the index is populated', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile project only');
  await page.goto('/');
  const pageScroll = await page.evaluate(() => { window.scrollTo(1000, 0); return window.scrollX; });
  expect(pageScroll).toBe(0);
  const table = await page.locator('.run-table-wrap').evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth }));
  expect(table.scroll).toBeGreaterThan(table.client);
  await expect(page.getByRole('heading', { name: 'Run index' })).toBeVisible();
});
