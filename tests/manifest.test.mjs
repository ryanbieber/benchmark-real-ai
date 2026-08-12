import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readManifest, validateManifest } from '../scripts/validate.mjs';

test('published manifest passes repository validation', () => {
  assert.deepEqual(validateManifest(readManifest()), []);
});

test('the repository contains at least one published run', () => {
  assert.ok(readManifest().runs.length >= 1);
});

test('every run records the complete non-duplicative token breakdown', () => {
  for (const run of readManifest().runs) {
    assert.equal(run.usage.totalTokens, run.usage.inputTokens + run.usage.outputTokens, run.id);
    assert.ok(run.usage.cachedInputTokens <= run.usage.inputTokens, run.id);
    assert.ok(run.usage.reasoningOutputTokens <= run.usage.outputTokens, run.id);
  }
});

test('governance contains the exact goal and model-harness rule', () => {
  const agents = readFileSync('AGENTS.md', 'utf8');
  assert.ok(agents.includes(readManifest().benchmark.goal));
  assert.match(agents, /model \+ reasoning setting \+ harness combination/i);
  assert.match(agents, /standalone dashboard opens directly from its table row/i);
  assert.match(agents, /API-equivalent estimate/i);
  assert.match(agents, /reasoning output is a subset of output/i);
});
