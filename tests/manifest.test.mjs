import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readManifest, validateManifest } from '../scripts/validate.mjs';

test('published manifest passes repository validation', () => {
  assert.deepEqual(validateManifest(readManifest()), []);
});

test('starter entries are visibly non-benchmark synthetic demos', () => {
  const manifest = readManifest();
  assert.ok(manifest.runs.length >= 4);
  assert.ok(manifest.runs.every((run) => run.status === 'demo' && run.dataSource.type === 'synthetic'));
  for (const run of manifest.runs) {
    const artifact = readFileSync(run.artifacts.displayHtml, 'utf8');
    assert.match(artifact, /DEMO FIXTURE/);
    assert.match(artifact, /SYNTHETIC/i);
  }
});

test('each fixture distinguishes model, harness, and reasoning', () => {
  for (const run of readManifest().runs) {
    assert.ok(run.model.id);
    assert.ok(run.harness.name);
    assert.ok(run.reasoning.native);
    assert.ok(run.reasoning.normalized);
  }
});

test('governance file contains the exact benchmark goal and harness rule', () => {
  const agents = readFileSync('AGENTS.md', 'utf8');
  assert.ok(agents.includes(readManifest().benchmark.goal));
  assert.match(agents, /model \+ reasoning setting \+ harness combination/i);
});
