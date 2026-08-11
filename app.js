const state = {
  runs: [],
  selected: new Set(),
  filters: { provider: 'all', model: 'all', harness: 'all', reasoning: 'all' }
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const titleCase = (value) => String(value).replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

async function loadRuns() {
  const response = await fetch('data/runs.json');
  if (!response.ok) throw new Error(`Could not load runs (${response.status})`);
  const data = await response.json();
  state.runs = data.runs;
  populateFilters();
  updateStats();
  render();
}

function unique(field) {
  return [...new Set(state.runs.map((run) => field(run)))].sort((a, b) => a.localeCompare(b));
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

function updateStats() {
  const benchmarkRuns = state.runs.filter((run) => run.status === 'benchmark');
  const source = benchmarkRuns.length ? benchmarkRuns : state.runs;
  $('#stat-runs').textContent = benchmarkRuns.length || `${state.runs.length} demo`;
  $('#stat-models').textContent = new Set(source.map((run) => run.model.id)).size;
  $('#stat-harnesses').textContent = new Set(source.map((run) => run.harness.name)).size;
}

function filteredRuns() {
  return state.runs.filter((run) =>
    (state.filters.provider === 'all' || run.provider === state.filters.provider) &&
    (state.filters.model === 'all' || run.model.name === state.filters.model) &&
    (state.filters.harness === 'all' || run.harness.name === state.filters.harness) &&
    (state.filters.reasoning === 'all' || run.reasoning.normalized === state.filters.reasoning)
  );
}

function cardTemplate(run, index) {
  const selected = state.selected.has(run.id);
  const repaired = run.artifacts.repaired ? '<span class="tag">Repaired</span>' : '';
  return `
    <article class="run-card${selected ? ' selected' : ''}" data-run-id="${escapeHtml(run.id)}">
      <div class="run-card-head">
        <span class="status-pill">${run.status === 'demo' ? 'UI DEMO · NOT BENCHMARK' : 'BENCHMARK RUN'}</span>
        <span class="run-card-index">${String(index + 1).padStart(2, '0')}</span>
      </div>
      <h3>${escapeHtml(run.model.name)}</h3>
      <div class="model-id">${escapeHtml(run.model.id)} · ${escapeHtml(run.provider)}</div>
      <p class="run-card-summary">${escapeHtml(run.summary)}</p>
      <div class="tag-row"><span class="tag">${escapeHtml(run.reasoning.normalized)} reasoning</span>${repaired}</div>
      <div class="run-meta-grid">
        <div><small>Harness</small><strong title="${escapeHtml(run.harness.name)}">${escapeHtml(run.harness.name)}</strong></div>
        <div><small>Data</small><strong>${escapeHtml(titleCase(run.dataSource.type))}</strong></div>
        <div><small>Validated</small><strong>${run.validation.passed ? 'Yes' : 'No'}</strong></div>
      </div>
      <div class="run-card-actions">
        <span class="run-score">${run.evaluation.total}/25</span>
        <button class="select-run" type="button" aria-pressed="${selected}">${selected ? 'Selected' : 'Add to walkthrough'} <span>${selected ? '✓' : '+'}</span></button>
      </div>
    </article>`;
}

function render() {
  const runs = filteredRuns();
  $('#result-count').textContent = runs.length;
  $('#run-grid').innerHTML = runs.map(cardTemplate).join('');
  $('#empty-state').hidden = runs.length > 0;
  $('#run-grid').hidden = runs.length === 0;
  document.querySelectorAll('.select-run').forEach((button) => button.addEventListener('click', () => {
    const id = button.closest('.run-card').dataset.runId;
    state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
    render();
  }));
  renderSelectionTray();
}

function renderSelectionTray() {
  const tray = $('#selection-tray');
  const selectedRuns = state.runs.filter((run) => state.selected.has(run.id));
  tray.hidden = selectedRuns.length === 0;
  $('#selection-count').textContent = selectedRuns.length;
  $('#selection-names').textContent = selectedRuns.map((run) => `${run.model.name} / ${run.reasoning.normalized}`).join(' · ');
  $('#start-walkthrough').href = `compare.html?runs=${selectedRuns.map((run) => encodeURIComponent(run.id)).join(',')}`;
}

function clearFilters() {
  Object.keys(state.filters).forEach((key) => {
    state.filters[key] = 'all';
    $(`#filter-${key}`).value = 'all';
  });
  render();
}

['provider', 'model', 'harness', 'reasoning'].forEach((key) => {
  $(`#filter-${key}`).addEventListener('change', (event) => {
    state.filters[key] = event.target.value;
    render();
  });
});

$('#clear-filters').addEventListener('click', clearFilters);
$('#empty-clear').addEventListener('click', clearFilters);
$('#clear-selection').addEventListener('click', () => { state.selected.clear(); render(); });
$('#copy-prompt').addEventListener('click', async () => {
  const prompt = $('#benchmark-prompt').textContent.replace(/^“|”$/g, '');
  await navigator.clipboard.writeText(prompt);
  $('#copy-prompt').textContent = 'Copied';
  window.setTimeout(() => { $('#copy-prompt').textContent = 'Copy'; }, 1400);
});

loadRuns().catch((error) => {
  $('#run-grid').innerHTML = `<div class="notice"><span>ERROR</span><p>${escapeHtml(error.message)}</p></div>`;
});
