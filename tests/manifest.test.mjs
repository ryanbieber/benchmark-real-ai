import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readManifest, validateManifest } from '../scripts/validate.mjs';

test('published manifest passes repository validation', () => {
  assert.deepEqual(validateManifest(readManifest()), []);
});

test('the repository contains no sample runs', () => {
  assert.deepEqual(readManifest().runs, []);
});

test('governance contains the exact goal and model-harness rule', () => {
  const agents = readFileSync('AGENTS.md', 'utf8');
  assert.ok(agents.includes(readManifest().benchmark.goal));
  assert.match(agents, /model \+ reasoning setting \+ harness combination/i);
  assert.match(agents, /standalone dashboard opens directly from its table row/i);
});
