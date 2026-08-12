const state = {
  runs: [],
  pricing: null,
  filters: { provider: 'all', model: 'all', harness: 'all', reasoning: 'all' }
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const titleCase = (value) => String(value).replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function unique(field) {
  return [...new Set(state.runs.map(field))].sort((a, b) => a.localeCompare(b));
}

function fillSelect(selector, values) {
  const select = $(selector);
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = titleCase(value);
    select.append(option);
  });
}

function populateFilters() {
  fillSelect('#filter-provider', unique((run) => run.provider));
  fillSelect('#filter-model', unique((run) => run.model.name));
  fillSelect('#filter-harness', unique((run) => run.harness.name));
  fillSelect('#filter-reasoning', unique((run) => run.reasoning.normalized));
}

function filteredRuns() {
  return state.runs.filter((run) =>
    (state.filters.provider === 'all' || run.provider === state.filters.provider) &&
    (state.filters.model === 'all' || run.model.name === state.filters.model) &&
    (state.filters.harness === 'all' || run.harness.name === state.filters.harness) &&
    (state.filters.reasoning === 'all' || run.reasoning.normalized === state.filters.reasoning)
  );
}

function formatDate(value) {
  if (!value) return 'Not reported';
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}

function formatTokens(value) {
  return Number.isInteger(value) ? new Intl.NumberFormat('en-US').format(value) : '—';
}

function formatDuration(value) {
  if (!Number.isFinite(value)) return '—';
  const seconds = Math.round(value);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${String(remainder).padStart(2, '0')}s` : `${remainder}s`;
}

function formatCost(value) {
  if (!Number.isFinite(value)) return '—';
  return value >= 1 ? `$${value.toFixed(2)}` : `$${value.toFixed(4)}`;
}

function estimateCost(run) {
  const usage = run.usage;
  const pricing = state.pricing;
  const rates = pricing?.models?.[run.model.id];
  if (!usage || !rates || !Number.isFinite(pricing.unitTokens)) return null;
  const uncachedInputTokens = usage.inputTokens - usage.cachedInputTokens;
  const uncachedInput = uncachedInputTokens * rates.inputUsd / pricing.unitTokens;
  const cachedInput = usage.cachedInputTokens * rates.cachedInputUsd / pricing.unitTokens;
  const output = usage.outputTokens * rates.outputUsd / pricing.unitTokens;
  return { uncachedInput, cachedInput, output, total: uncachedInput + cachedInput + output };
}

function rowTemplate(run) {
  const artifact = escapeHtml(run.artifacts.displayHtml);
  const usage = run.usage || {};
  const cost = estimateCost(run);
  const runMeta = `${run.provider} · ${run.dataSource.type} · ${run.validation.passed ? 'validated' : 'failed'} · ${formatDate(run.run.completedAt)}`;
  return `
    <tr class="run-row" data-artifact="${artifact}" tabindex="0" aria-label="Open ${escapeHtml(run.model.name)} dashboard">
      <td class="model-cell"><a href="${artifact}"><strong>${escapeHtml(run.model.name)}</strong><small>${escapeHtml(runMeta)}</small></a></td>
      <td><strong>${escapeHtml(run.harness.name)}</strong><small>${escapeHtml(run.harness.version)}</small></td>
      <td><span class="reasoning-badge">${escapeHtml(titleCase(run.reasoning.normalized))}</span><small>${escapeHtml(run.reasoning.native)}</small></td>
      <td class="metric-cell">${formatTokens(usage.inputTokens)}</td>
      <td class="metric-cell">${formatTokens(usage.cachedInputTokens)}</td>
      <td class="metric-cell">${formatTokens(usage.outputTokens)}</td>
      <td class="metric-cell">${formatTokens(usage.reasoningOutputTokens)}<small>of output</small></td>
      <td class="metric-cell total-cell">${formatTokens(usage.totalTokens)}</td>
      <td class="metric-cell">${formatDuration(run.timestamps?.durationSeconds)}</td>
      <td class="metric-cell cost-cell">${formatCost(cost?.total)}<small>API est.</small></td>
      <td class="open-cell"><a href="${artifact}" aria-label="Open ${escapeHtml(run.model.name)} artifact">↗</a></td>
    </tr>`;
}

function renderCostChart() {
  const rows = state.runs.map((run) => ({ run, cost: estimateCost(run) }));
  const pricedRows = rows.filter(({ cost }) => cost);
  const max = Math.max(...pricedRows.map(({ cost }) => cost.total), 0);
  const combined = pricedRows.reduce((sum, { cost }) => sum + cost.total, 0);
  $('#combined-cost').textContent = pricedRows.length ? formatCost(combined) : 'Unavailable';

  $('#cost-chart').innerHTML = rows.map(({ run, cost }) => {
    const label = `${run.model.name} · ${run.reasoning.normalized} · ${run.harness.name}`;
    if (!cost) return `<div class="cost-row"><div class="cost-label"><strong>${escapeHtml(run.model.name)}</strong><span>${escapeHtml(label)}</span></div><div class="cost-unavailable">Pricing unavailable</div></div>`;
    const scale = max ? 100 / max : 0;
    return `
      <div class="cost-row">
        <div class="cost-label"><strong>${escapeHtml(run.model.name)}</strong><span>${escapeHtml(run.reasoning.normalized)} reasoning · ${escapeHtml(run.harness.name)}</span></div>
        <div class="cost-bar-track" aria-label="${escapeHtml(label)} estimated cost ${formatCost(cost.total)}">
          <span class="cost-segment input" style="width:${cost.uncachedInput * scale}%" title="Uncached input ${formatCost(cost.uncachedInput)}"></span>
          <span class="cost-segment cached" style="width:${cost.cachedInput * scale}%" title="Cached input ${formatCost(cost.cachedInput)}"></span>
          <span class="cost-segment output" style="width:${cost.output * scale}%" title="Output ${formatCost(cost.output)}"></span>
        </div>
        <strong class="cost-value">${formatCost(cost.total)}</strong>
      </div>`;
  }).join('');

  const pricing = state.pricing;
  if (!pricing) {
    $('#pricing-note').textContent = 'No pricing snapshot is available.';
    return;
  }
  const rates = Object.entries(pricing.models).map(([model, rate]) =>
    `<span><strong>${escapeHtml(model)}</strong> input $${rate.inputUsd} · cached $${rate.cachedInputUsd} · output $${rate.outputUsd}</span>`
  ).join('');
  $('#pricing-note').innerHTML = `
    <div class="cost-legend"><span><i class="input"></i>Uncached input</span><span><i class="cached"></i>Cached input</span><span><i class="output"></i>Output</span></div>
    <p>API-equivalent estimates, not actual Codex subscription charges. Standard short-context rates per 1M tokens, retrieved ${escapeHtml(pricing.retrievedAt)} from <a href="${escapeHtml(pricing.source)}">OpenAI pricing ↗</a>. Cached input is included in input; reasoning is included in output and is not charged twice.</p>
    <div class="rate-list">${rates}</div>`;
}

function render() {
  const runs = filteredRuns();
  $('#run-table-body').innerHTML = runs.map(rowTemplate).join('');
  $('#table-empty').hidden = runs.length > 0;
  $('#result-count').textContent = `${runs.length} ${runs.length === 1 ? 'run' : 'runs'} shown`;

  document.querySelectorAll('.run-row').forEach((row) => {
    const open = () => { window.location.href = row.dataset.artifact; };
    row.addEventListener('click', (event) => { if (!event.target.closest('a')) open(); });
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
    });
  });
}

function updateStats() {
  $('#stat-runs').textContent = state.runs.length;
  $('#stat-models').textContent = new Set(state.runs.map((run) => run.model.id)).size;
  $('#stat-harnesses').textContent = new Set(state.runs.map((run) => run.harness.name)).size;
}

function clearFilters() {
  Object.keys(state.filters).forEach((key) => {
    state.filters[key] = 'all';
    $(`#filter-${key}`).value = 'all';
  });
  render();
}

async function loadRuns() {
  const response = await fetch('data/runs.json');
  if (!response.ok) throw new Error(`Could not load runs (${response.status})`);
  const data = await response.json();
  state.runs = data.runs.filter((run) => run.status === 'benchmark');
  state.pricing = data.benchmark?.pricing || null;
  populateFilters();
  updateStats();
  render();
  renderCostChart();
}

['provider', 'model', 'harness', 'reasoning'].forEach((key) => {
  $(`#filter-${key}`).addEventListener('change', (event) => {
    state.filters[key] = event.target.value;
    render();
  });
});

$('#clear-filters').addEventListener('click', clearFilters);
$('#copy-prompt').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('#benchmark-prompt').textContent.trim());
  $('#copy-prompt').textContent = 'Copied';
  window.setTimeout(() => { $('#copy-prompt').textContent = 'Copy'; }, 1400);
});

loadRuns().catch((error) => {
  $('#table-empty').hidden = false;
  $('#table-empty h3').textContent = error.message;
});
