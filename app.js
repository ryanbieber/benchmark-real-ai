const state = {
  runs: [],
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

function rowTemplate(run) {
  const artifact = escapeHtml(run.artifacts.displayHtml);
  return `
    <tr class="run-row" data-artifact="${artifact}" tabindex="0" aria-label="Open ${escapeHtml(run.model.name)} dashboard">
      <td class="model-cell"><a href="${artifact}"><strong>${escapeHtml(run.model.name)}</strong><small>${escapeHtml(run.model.id)}</small></a></td>
      <td>${escapeHtml(run.provider)}</td>
      <td><strong>${escapeHtml(run.harness.name)}</strong><small>${escapeHtml(run.harness.version)}</small></td>
      <td><span class="reasoning-badge">${escapeHtml(titleCase(run.reasoning.normalized))}</span><small>${escapeHtml(run.reasoning.native)}</small></td>
      <td>${escapeHtml(titleCase(run.dataSource.type))}</td>
      <td><span class="validation-mark ${run.validation.passed ? 'passed' : 'failed'}">${run.validation.passed ? 'Passed' : 'Failed'}</span></td>
      <td>${escapeHtml(formatDate(run.run.completedAt))}</td>
      <td class="open-cell"><a href="${artifact}" aria-label="Open ${escapeHtml(run.model.name)} artifact">↗</a></td>
    </tr>`;
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
  populateFilters();
  updateStats();
  render();
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
