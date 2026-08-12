const state = {
  runs: [],
  pricing: null,
  filters: { provider: 'all', model: 'all', harness: 'all', reasoning: 'all', search: '' }
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const titleCase = (value) => String(value).replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const reasoningLabel = (value) => value === 'xhigh' ? 'Extra High' : titleCase(value);
const reasoningFacetLabel = (value) => ['xhigh', 'max'].includes(value) ? `${reasoningLabel(value)} (${value})` : reasoningLabel(value);
const reasoningDescription = (run) => `${reasoningLabel(run.reasoning.normalized)} (${run.reasoning.native})`;

function unique(field) {
  return [...new Set(state.runs.map(field))].sort((a, b) => a.localeCompare(b));
}

function fillSelect(selector, values, label = titleCase) {
  const select = $(selector);
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label(value);
    select.append(option);
  });
}

function populateFilters() {
  fillSelect('#filter-provider', unique((run) => run.provider));
  fillSelect('#filter-model', unique((run) => run.model.name));
  fillSelect('#filter-harness', unique((run) => run.harness.name));
  fillSelect('#filter-reasoning', unique((run) => run.reasoning.normalized), reasoningFacetLabel);
}

function filteredRuns() {
  const query = state.filters.search.trim().toLowerCase();
  return state.runs.filter((run) => {
    const searchableFacets = [
      run.id, run.provider, run.model.id, run.model.name, run.model.version,
      run.harness.name, run.harness.version, run.harness.interface,
      run.reasoning.native, run.reasoning.normalized, reasoningDescription(run), run.dataSource.type
    ].join(' ').toLowerCase();
    return (state.filters.provider === 'all' || run.provider === state.filters.provider) &&
      (state.filters.model === 'all' || run.model.name === state.filters.model) &&
      (state.filters.harness === 'all' || run.harness.name === state.filters.harness) &&
      (state.filters.reasoning === 'all' || run.reasoning.normalized === state.filters.reasoning) &&
      (!query || searchableFacets.includes(query));
  }).sort(compareByCost);
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

function compareByCost(a, b) {
  const costA = estimateCost(a)?.total;
  const costB = estimateCost(b)?.total;
  if (!Number.isFinite(costA)) return Number.isFinite(costB) ? 1 : 0;
  if (!Number.isFinite(costB)) return -1;
  return costA - costB;
}

function rowTemplate(run) {
  const artifact = escapeHtml(run.artifacts.displayHtml);
  const usage = run.usage || {};
  const cost = estimateCost(run);
  const runMeta = `${run.provider} · ${run.dataSource.type} · ${run.validation.passed ? 'validated' : 'failed'} · ${formatDate(run.run.completedAt)}`;
  return `
    <tr class="run-row" data-artifact="${artifact}" data-cost="${cost?.total ?? ''}" tabindex="0" aria-label="Open ${escapeHtml(run.model.name)} dashboard">
      <td class="model-cell"><a href="${artifact}"><strong>${escapeHtml(run.model.name)}</strong><small>${escapeHtml(runMeta)}</small></a></td>
      <td><strong>${escapeHtml(run.harness.name)}</strong><small>${escapeHtml(run.harness.version)}</small></td>
      <td><span class="reasoning-badge">${escapeHtml(reasoningLabel(run.reasoning.normalized))}</span><small>Native: ${escapeHtml(run.reasoning.native)}</small></td>
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
  const rows = [...state.runs].sort(compareByCost).map((run) => ({ run, cost: estimateCost(run) }));
  const pricedRows = rows.filter(({ cost }) => cost);
  const max = Math.max(...pricedRows.map(({ cost }) => cost.total), 0);
  const combined = pricedRows.reduce((sum, { cost }) => sum + cost.total, 0);
  $('#combined-cost').textContent = pricedRows.length ? formatCost(combined) : 'Unavailable';

  $('#cost-chart').innerHTML = rows.map(({ run, cost }) => {
    const reasoning = reasoningDescription(run);
    const label = `${run.model.name} · ${reasoning} · ${run.harness.name}`;
    if (!cost) return `<div class="cost-row"><div class="cost-label"><strong>${escapeHtml(run.model.name)}</strong><span>${escapeHtml(label)}</span></div><div class="cost-unavailable">Pricing unavailable</div></div>`;
    const scale = max ? 100 / max : 0;
    return `
      <div class="cost-row">
        <div class="cost-label"><strong>${escapeHtml(run.model.name)}</strong><span>${escapeHtml(reasoning)} reasoning · ${escapeHtml(run.harness.name)}</span></div>
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

const plotMetrics = {
  score: {
    title: 'Cost versus observed outcome',
    label: 'Manual rubric score / 25',
    value: (run) => run.evaluation?.total,
    format: (value) => `${value}/25`,
    domain: () => [0, 25],
    description: 'Higher is a stronger manual rubric result. The dashed line marks the cost–score frontier; these scores are observational and reviewer-assigned, not scientific measurements.'
  },
  reasoningShare: {
    title: 'Cost versus reasoning allocation',
    label: 'Reasoning share of output',
    value: (run) => run.usage.outputTokens ? run.usage.reasoningOutputTokens / run.usage.outputTokens * 100 : 0,
    format: (value) => `${value.toFixed(1)}%`,
    domain: (values) => [0, Math.max(10, Math.ceil(Math.max(...values) / 10) * 10)],
    description: 'Higher means a larger share of output tokens were classified as reasoning. It shows work allocation, not reasoning quality.'
  },
  duration: {
    title: 'Cost versus elapsed time',
    label: 'Elapsed time (minutes)',
    value: (run) => run.timestamps.durationSeconds / 60,
    format: (value) => `${value.toFixed(1)} min`,
    domain: (values) => [0, Math.ceil(Math.max(...values) / 5) * 5],
    description: 'Higher means the harness spent more wall-clock time completing and validating the run. Time includes tools and validation, not just model generation.'
  },
  tokens: {
    title: 'Cost versus token volume',
    label: 'Total tokens (millions)',
    value: (run) => run.usage.totalTokens / 1_000_000,
    format: (value) => `${value.toFixed(2)}M`,
    domain: (values) => [0, Math.ceil(Math.max(...values) * 2) / 2],
    description: 'Higher means more total input plus output tokens. Cached input and reasoning output remain subsets and are not added again.'
  }
};

function renderTradeoffPlot() {
  const metricKey = $('#tradeoff-metric').value;
  const metric = plotMetrics[metricKey];
  const points = [...state.runs].sort(compareByCost).map((run, index) => ({
    run,
    index: index + 1,
    cost: estimateCost(run)?.total,
    value: metric.value(run)
  })).filter((point) => Number.isFinite(point.cost) && Number.isFinite(point.value));

  $('#tradeoff-title').textContent = metric.title;
  $('#tradeoff-description').textContent = metric.description;
  if (!points.length) {
    $('#tradeoff-plot').textContent = 'No priced runs are available.';
    $('#plot-key').innerHTML = '';
    return;
  }

  const width = 960;
  const height = 500;
  const margin = { top: 34, right: 36, bottom: 74, left: 78 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const minCost = Math.min(...points.map((point) => point.cost));
  const maxCost = Math.max(...points.map((point) => point.cost));
  const logMin = Math.log10(minCost * 0.72);
  const logMax = Math.log10(maxCost * 1.22);
  const [yMin, yMax] = metric.domain(points.map((point) => point.value));
  const x = (cost) => margin.left + (Math.log10(cost) - logMin) / (logMax - logMin) * chartWidth;
  const y = (value) => margin.top + (yMax - value) / (yMax - yMin || 1) * chartHeight;
  const radius = (tokens) => 8 + Math.sqrt(tokens / Math.max(...points.map((point) => point.run.usage.totalTokens))) * 13;
  const xTicks = [0.01, 0.03, 0.1, 0.3, 1, 3].filter((tick) => tick >= minCost * 0.72 && tick <= maxCost * 1.22);
  const yTicks = Array.from({ length: 6 }, (_, index) => yMin + (yMax - yMin) * index / 5);
  const frontier = [];
  let best = -Infinity;
  if (metricKey === 'score') points.forEach((point) => {
    if (point.value > best) { frontier.push(point); best = point.value; }
  });

  const grid = yTicks.map((tick) => `<g><line x1="${margin.left}" y1="${y(tick)}" x2="${width - margin.right}" y2="${y(tick)}"/><text x="${margin.left - 13}" y="${y(tick) + 4}" text-anchor="end">${escapeHtml(metric.format(tick))}</text></g>`).join('');
  const costTicks = xTicks.map((tick) => `<g><line x1="${x(tick)}" y1="${margin.top}" x2="${x(tick)}" y2="${height - margin.bottom}"/><text x="${x(tick)}" y="${height - margin.bottom + 27}" text-anchor="middle">${formatCost(tick)}</text></g>`).join('');
  const frontierPath = frontier.length > 1 ? `<path class="frontier" d="M ${frontier.map((point) => `${x(point.cost)} ${y(point.value)}`).join(' L ')}"/>` : '';
  const circles = points.map((point) => {
    const label = `${point.run.model.name}, ${reasoningDescription(point.run)} reasoning, ${point.run.harness.name}: ${formatCost(point.cost)}, ${metric.format(point.value)}`;
    const r = radius(point.run.usage.totalTokens);
    const pointX = x(point.cost);
    const pointY = y(point.value);
    const labelOnLeft = pointX > width - 190;
    const labelX = labelOnLeft ? pointX - r - 7 : pointX + r + 7;
    const labelAnchor = labelOnLeft ? 'end' : 'start';
    const plotLabel = `${point.run.model.name} · ${point.run.reasoning.native}`;
    return `<a class="tradeoff-point" href="${escapeHtml(point.run.artifacts.displayHtml)}" aria-label="${escapeHtml(label)}"><title>${escapeHtml(label)}</title><circle cx="${pointX}" cy="${pointY}" r="${r}"/><text class="plot-label" x="${labelX}" y="${pointY + 4}" text-anchor="${labelAnchor}">${escapeHtml(plotLabel)}</text></a>`;
  }).join('');

  $('#tradeoff-plot').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="tradeoff-svg-title tradeoff-svg-desc"><title id="tradeoff-svg-title">Estimated cost versus ${escapeHtml(metric.label)}</title><desc id="tradeoff-svg-desc">Each labeled point is one model, reasoning setting, and harness run. Labels show the model and native reasoning setting. Bubble size represents total tokens. Point color has no categorical meaning.</desc><g class="plot-grid">${grid}${costTicks}</g>${frontierPath}${circles}<text class="axis-title" x="${margin.left + chartWidth / 2}" y="${height - 15}" text-anchor="middle">Estimated API-equivalent cost, USD (log scale)</text><text class="axis-title" transform="translate(18 ${margin.top + chartHeight / 2}) rotate(-90)" text-anchor="middle">${escapeHtml(metric.label)}</text></svg>`;
  $('#plot-key').innerHTML = points.map((point) => `<a href="${escapeHtml(point.run.artifacts.displayHtml)}"><b class="plot-key-model">${escapeHtml(point.run.model.name)}</b><span>Reasoning: ${escapeHtml(reasoningDescription(point.run))} · ${escapeHtml(point.run.harness.name)} · ${formatCost(point.cost)} · ${escapeHtml(metric.format(point.value))}</span></a>`).join('');
}

function render() {
  const runs = filteredRuns();
  $('#run-table-body').innerHTML = runs.map(rowTemplate).join('');
  $('#table-empty').hidden = runs.length > 0;
  $('#result-count').textContent = `${runs.length} ${runs.length === 1 ? 'run' : 'runs'} shown`;
  $('#facet-result-count').textContent = runs.length === state.runs.length ? `All ${runs.length} runs` : `${runs.length} of ${state.runs.length} runs`;

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
  ['provider', 'model', 'harness', 'reasoning'].forEach((key) => {
    state.filters[key] = 'all';
    $(`#filter-${key}`).value = 'all';
  });
  state.filters.search = '';
  $('#filter-search').value = '';
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
  renderTradeoffPlot();
}

['provider', 'model', 'harness', 'reasoning'].forEach((key) => {
  $(`#filter-${key}`).addEventListener('change', (event) => {
    state.filters[key] = event.target.value;
    render();
  });
});

$('#filter-search').addEventListener('input', (event) => {
  state.filters.search = event.target.value;
  render();
});

$('#clear-filters').addEventListener('click', clearFilters);
$('#tradeoff-metric').addEventListener('change', renderTradeoffPlot);
$('#copy-prompt').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('#benchmark-prompt').textContent.trim());
  $('#copy-prompt').textContent = 'Copied';
  window.setTimeout(() => { $('#copy-prompt').textContent = 'Copy'; }, 1400);
});

loadRuns().catch((error) => {
  $('#table-empty').hidden = false;
  $('#table-empty h3').textContent = error.message;
});
