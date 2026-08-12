import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const exactGoal = 'I want to forecast the sp500, show me how to do it in an interactive dashboard in html. Do not stop until you have a working and validated dashboard.';
const scoreKeys = ['taskFulfillment', 'interactivityUsability', 'forecastingMethodology', 'uncertaintyHonesty', 'technicalRobustness'];
const normalizedReasoningBands = ['default', 'low', 'medium', 'high', 'xhigh', 'max'];
const reasoningBands = new Set(normalizedReasoningBands);
const dataTypes = new Set(['live', 'historical-snapshot', 'synthetic', 'undocumented']);
const usageKeys = ['inputTokens', 'cachedInputTokens', 'outputTokens', 'reasoningOutputTokens', 'totalTokens'];

function safePath(relativePath) {
  if (typeof relativePath !== 'string' || !relativePath || relativePath.startsWith('/') || relativePath.includes('\\')) return null;
  const absolute = resolve(root, relativePath);
  return absolute === root || absolute.startsWith(`${root}${sep}`) ? absolute : null;
}

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function validateManifest(manifest) {
  const errors = [];
  const ids = new Set();
  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (manifest.benchmark?.goal !== exactGoal) errors.push('benchmark goal must match the exact prompt in AGENTS.md');
  if (JSON.stringify(manifest.benchmark?.normalizedReasoningBands) !== JSON.stringify(normalizedReasoningBands)) {
    errors.push(`benchmark normalized reasoning bands must be ${normalizedReasoningBands.join(', ')}`);
  }
  const pricing = manifest.benchmark?.pricing;
  if (!pricing || pricing.currency !== 'USD' || !Number.isFinite(pricing.unitTokens) || pricing.unitTokens <= 0) {
    errors.push('benchmark pricing must declare USD and a positive token unit');
  }
  if (pricing?.serviceTier !== 'standard' || pricing?.contextBand !== 'short') errors.push('benchmark pricing must disclose the standard short-context rate band');
  if (!/^https:\/\/developers\.openai\.com\//.test(pricing?.source || '')) errors.push('benchmark pricing source must be an official OpenAI Developers URL');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pricing?.retrievedAt || '')) errors.push('benchmark pricing must include a YYYY-MM-DD retrieval date');
  if (!Array.isArray(manifest.runs)) return ['runs must be an array'];

  manifest.runs.forEach((run, index) => {
    const label = run.id || `run at index ${index}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(run.id || '')) errors.push(`${label}: id must be lowercase kebab-case`);
    if (ids.has(run.id)) errors.push(`${label}: duplicate id`);
    ids.add(run.id);
    if (run.status !== 'benchmark') errors.push(`${label}: status must be benchmark`);
    if (!run.provider || !run.model?.id || !run.model?.name || !run.model?.version) errors.push(`${label}: complete provider and model identity are required`);
    if (!run.harness?.name || !run.harness?.version || !run.harness?.interface || !run.harness?.configuration) errors.push(`${label}: complete harness metadata is required`);
    if (!Array.isArray(run.harness?.capabilities) || !run.harness.capabilities.length) errors.push(`${label}: at least one harness capability is required`);
    if (!run.reasoning?.native || !reasoningBands.has(run.reasoning?.normalized)) errors.push(`${label}: native and valid normalized reasoning values are required`);
    if (run.reasoning?.native === 'xhigh' && run.reasoning?.normalized !== 'xhigh') errors.push(`${label}: native xhigh reasoning must remain normalized as xhigh`);
    if (run.reasoning?.native === 'max' && run.reasoning?.normalized !== 'max') errors.push(`${label}: native max reasoning must remain normalized as max`);
    if (!dataTypes.has(run.dataSource?.type)) errors.push(`${label}: invalid data-source classification`);
    if (!run.summary) errors.push(`${label}: summary is required`);

    const startedAt = Date.parse(run.timestamps?.startedAt);
    const finishedAt = Date.parse(run.timestamps?.finishedAt);
    if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt) || finishedAt < startedAt) errors.push(`${label}: valid ordered UTC timestamps are required`);
    if (!Number.isFinite(run.timestamps?.durationSeconds) || run.timestamps.durationSeconds < 0) errors.push(`${label}: non-negative durationSeconds is required`);

    const usage = run.usage || {};
    usageKeys.forEach((key) => {
      if (!Number.isInteger(usage[key]) || usage[key] < 0) errors.push(`${label}: usage.${key} must be a non-negative integer`);
    });
    if (Number.isInteger(usage.cachedInputTokens) && Number.isInteger(usage.inputTokens) && usage.cachedInputTokens > usage.inputTokens) errors.push(`${label}: cached input tokens cannot exceed input tokens`);
    if (Number.isInteger(usage.reasoningOutputTokens) && Number.isInteger(usage.outputTokens) && usage.reasoningOutputTokens > usage.outputTokens) errors.push(`${label}: reasoning output tokens cannot exceed output tokens`);
    if (Number.isInteger(usage.totalTokens) && Number.isInteger(usage.inputTokens) && Number.isInteger(usage.outputTokens) && usage.totalTokens !== usage.inputTokens + usage.outputTokens) errors.push(`${label}: total tokens must equal input plus output; cached and reasoning tokens are subsets`);
    if (!usage.source) errors.push(`${label}: token usage source is required`);
    if (usage.actualCostUsd !== null && (!Number.isFinite(usage.actualCostUsd) || usage.actualCostUsd < 0)) errors.push(`${label}: actualCostUsd must be null or a non-negative number`);

    const modelRates = pricing?.models?.[run.model?.id];
    if (!modelRates) errors.push(`${label}: current pricing is required for model ${run.model?.id || 'unknown'}`);
    else ['inputUsd', 'cachedInputUsd', 'outputUsd'].forEach((key) => {
      if (!Number.isFinite(modelRates[key]) || modelRates[key] < 0) errors.push(`${label}: pricing ${run.model.id}.${key} must be a non-negative number`);
    });

    const artifacts = run.artifacts || {};
    const artifactKeys = ['rawResponse', 'originalHtml', 'displayHtml', 'validationEvidence'];
    artifactKeys.forEach((key) => {
      const path = safePath(artifacts[key]);
      if (!path) errors.push(`${label}: ${key} must be a safe relative path`);
      else if (!existsSync(path)) errors.push(`${label}: ${key} does not exist at ${artifacts[key]}`);
      else if (artifacts.sha256?.[key] !== hashFile(path)) errors.push(`${label}: ${key} SHA-256 does not match`);
    });
    if (artifacts.repaired && !artifacts.repairLog) errors.push(`${label}: repaired artifacts require a repair log`);
    if (!artifacts.repaired && artifacts.repairLog !== null) errors.push(`${label}: unrepaired artifacts must use a null repair log`);
    if (artifacts.repairLog) {
      const repairPath = safePath(artifacts.repairLog);
      if (!repairPath || !existsSync(repairPath)) errors.push(`${label}: repair log does not exist`);
    }
    const scores = run.evaluation?.scores || {};
    let total = 0;
    scoreKeys.forEach((key) => {
      const score = scores[key];
      if (!Number.isInteger(score) || score < 0 || score > 5) errors.push(`${label}: ${key} must be an integer from 0 to 5`);
      else total += score;
    });
    if (run.evaluation?.total !== total) errors.push(`${label}: evaluation total must equal score sum (${total})`);
    if (!run.evaluation?.reviewer || !run.evaluation?.notes) errors.push(`${label}: reviewer and assessment notes are required`);
    if (typeof run.validation?.passed !== 'boolean' || !Array.isArray(run.validation?.checks)) errors.push(`${label}: structured validation result is required`);
  });
  return errors;
}

export function readManifest() {
  return JSON.parse(readFileSync(resolve(root, 'data/runs.json'), 'utf8'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let errors = [];
  try { errors = validateManifest(readManifest()); }
  catch (error) { errors = [`manifest could not be read: ${error.message}`]; }
  if (errors.length) {
    console.error(`Manifest validation failed (${errors.length}):`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
  } else {
    console.log(`Manifest valid: ${readManifest().runs.length} runs checked.`);
  }
}
