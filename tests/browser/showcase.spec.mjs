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
  validation: { passed: true },
  evaluation: { total: 20 }
};

test('landing page sorts runs by estimated cost and renders the behavior map', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Same task/i })).toBeVisible();
  const plotPrecedesIndex = await page.evaluate(() => Boolean(document.querySelector('#behavior-map').compareDocumentPosition(document.querySelector('#run-index')) & Node.DOCUMENT_POSITION_FOLLOWING));
  expect(plotPrecedesIndex).toBe(true);
  await expect(page.getByRole('heading', { name: 'Run index' })).toBeVisible();
  for (const heading of ['Model', 'Harness', 'Reasoning level', 'Input', 'Cached', 'Output', 'Reasoning tokens', 'Total', 'Time', 'Est. cost ↑']) await expect(page.getByRole('columnheader', { name: heading, exact: true })).toBeVisible();
  await expect(page.locator('.run-row')).toHaveCount(publishedRuns.length);
  await expect(page.locator('#result-count')).toContainText(`${publishedRuns.length}`);
  await expect(page.locator('#facet-panel')).not.toHaveAttribute('open', '');
  await page.locator('#facet-panel summary').click();
  await expect(page.locator('#facet-panel')).toHaveAttribute('open', '');
  await expect(page.locator('#filter-reasoning option[value="xhigh"]')).toHaveText('Extra High (xhigh)');
  await expect(page.locator('#filter-reasoning option[value="max"]')).toHaveText('Max (max)');
  await page.locator('#filter-search').fill('xhigh');
  await expect(page.locator('.run-row')).toHaveCount(2);
  await expect(page.locator('.run-row')).toContainText(['Extra High', 'Extra High']);
  await expect(page.locator('#facet-result-count')).toHaveText(`2 of ${publishedRuns.length} runs`);
  await page.locator('#clear-filters').click();
  await expect(page.locator('.run-row', { hasText: 'gpt-5.4-mini' }).filter({ hasText: 'Extra High' })).toHaveCount(1);
  await expect(page.locator('.run-row', { hasText: 'gpt-5.6-luna' }).filter({ hasText: 'Extra High' })).toHaveCount(1);
  await expect(page.locator('.run-row', { hasText: 'gpt-5.6-luna' }).filter({ hasText: 'Max' })).toHaveCount(1);
  await expect(page.locator('.run-row').first()).toContainText('gpt-5.6-luna');
  await expect(page.locator('#run-table-body')).toContainText(publishedRuns.at(-1).model.name);
  await expect(page.locator('.run-row').first()).toContainText('191,277');
  await expect(page.locator('.run-row').first()).toContainText('173,312');
  await expect(page.locator('.run-row').first()).toContainText('4,133');
  await expect(page.locator('.run-row').first()).toContainText('1m 32s');
  const costs = await page.locator('.run-row').evaluateAll((rows) => rows.map((row) => Number(row.dataset.cost)));
  expect(costs).toEqual([...costs].sort((a, b) => a - b));
  await expect(page.getByRole('heading', { name: /What each run would cost/i })).toBeVisible();
  await expect(page.locator('.cost-row')).toHaveCount(publishedRuns.length);
  await expect(page.locator('#combined-cost')).toHaveText('$7.45');
  await expect(page.locator('#pricing-note')).toContainText('not actual Codex subscription charges');
  await expect(page.getByRole('heading', { name: 'Cost versus token volume' })).toBeVisible();
  await expect(page.locator('.tradeoff-point')).toHaveCount(publishedRuns.length);
  await expect(page.locator('.frontier')).toHaveCount(0);
  await expect(page.locator('#plot-key a')).toHaveCount(publishedRuns.length);
  await expect(page.locator('#plot-key a', { hasText: 'gpt-5.6-luna' })).toHaveCount(5);
  await expect(page.locator('#plot-key a', { hasText: 'gpt-5.6-luna' }).filter({ hasText: 'Extra High (xhigh)' })).toHaveCount(1);
  await expect(page.locator('#plot-key a', { hasText: 'gpt-5.6-luna' }).filter({ hasText: 'Max (max)' })).toHaveCount(1);
  const pointFills = await page.locator('.tradeoff-point circle').evaluateAll((points) => [...new Set(points.map((point) => getComputedStyle(point).fill))]);
  expect(pointFills).toHaveLength(1);
  await expect(page.locator('#tradeoff-svg-desc')).toContainText('Point color has no categorical meaning');
  await expect(page.locator('#tradeoff-plot')).toContainText('Total tokens');
  await page.locator('#tradeoff-metric').selectOption('reasoningShare');
  await expect(page.getByRole('heading', { name: 'Cost versus reasoning allocation' })).toBeVisible();
  await expect(page.locator('#tradeoff-description')).toContainText('share of output tokens');
  await expect(page.locator('#tradeoff-plot')).toContainText('Reasoning share of output');
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
