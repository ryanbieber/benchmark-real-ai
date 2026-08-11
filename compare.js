const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const titleCase = (value) => String(value).replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const scoreLabels = {
  taskFulfillment: 'Task fulfillment',
  interactivityUsability: 'Interactivity & usability',
  forecastingMethodology: 'Forecast methodology',
  uncertaintyHonesty: 'Uncertainty & honesty',
  technicalRobustness: 'Technical robustness'
};

const state = { runs: [], active: 0, split: false };

function formatValue(value, suffix = '') {
  return value === null || value === undefined ? 'Not reported' : `${value}${suffix}`;
}

function updateUrl() {
  const params = new URLSearchParams();
  params.set('runs', state.runs.map((run) => run.id).join(','));
  params.set('active', String(state.active));
  history.replaceState(null, '', `${location.pathname}?${params}`);
}

function render() {
  if (!state.runs.length) return;
  const run = state.runs[state.active];
  const current = state.active + 1;
  $('#run-title').textContent = `${run.model.name} · ${titleCase(run.reasoning.normalized)}`;
  $('#progress-label').textContent = `Run ${current} of ${state.runs.length}`;
  $('#progress-name').textContent = `${run.harness.name} / ${run.reasoning.native}`;
  $('#progress-bar').style.width = `${(current / state.runs.length) * 100}%`;
  $('#status-pill').textContent = run.status === 'demo' ? 'UI DEMO' : 'BENCHMARK';
  $('#artifact-label').textContent = run.artifacts.repaired ? 'Repaired display · original retained' : 'Original interactive artifact';
  $('#artifact-frame').src = run.artifacts.displayHtml;

  $('#panel-model').textContent = run.model.name;
  $('#panel-summary').textContent = run.summary;
  $('#panel-tags').innerHTML = [run.provider, `${run.reasoning.normalized} reasoning`, run.harness.name, run.dataSource.type]
    .map((tag) => `<span class="tag">${escapeHtml(titleCase(tag))}</span>`).join('');

  const metadata = [
    ['Model ID', run.model.id],
    ['Model version', run.model.version],
    ['Native reasoning', run.reasoning.native],
    ['Harness', `${run.harness.name} ${run.harness.version}`],
    ['Interface', run.harness.interface],
    ['Capabilities', run.harness.capabilities.join(', ')],
    ['Duration', run.run.durationMs === null ? null : `${(run.run.durationMs / 1000).toFixed(1)}s`],
    ['Tokens in / out', run.run.inputTokens === null ? null : `${run.run.inputTokens} / ${run.run.outputTokens}`],
    ['Cost', run.run.costUsd === null ? null : `$${run.run.costUsd.toFixed(4)}`],
    ['Data source', titleCase(run.dataSource.type)]
  ];
  $('#metadata-list').innerHTML = metadata.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(formatValue(value))}</dd></div>`).join('');

  $('#score-total').textContent = `${run.evaluation.total}/25`;
  $('#score-list').innerHTML = Object.entries(scoreLabels).map(([key, label]) => {
    const score = run.evaluation.scores[key];
    return `<div class="score-row"><span>${label}</span><span>${score}/5</span><div class="score-bar"><i style="width:${score * 20}%"></i></div></div>`;
  }).join('');
  $('#review-note').textContent = run.evaluation.notes;

  const repaired = run.artifacts.repaired
    ? `<a class="warning" href="${escapeHtml(run.artifacts.repairLog)}">Repair disclosed <span>↗</span></a>`
    : `<div class="warning" style="color:#4b5541;border-color:rgba(75,85,65,.28);background:rgba(75,85,65,.05)">No rendering repair <span>✓</span></div>`;
  $('#evidence-list').innerHTML = `
    <button type="button" id="show-raw">Visible response <span>View</span></button>
    <a href="${escapeHtml(run.artifacts.validationEvidence)}">Validation evidence <span>↗</span></a>
    <a href="${escapeHtml(run.artifacts.originalHtml)}" download>Original HTML <span>↓</span></a>
    ${repaired}`;
  $('#show-raw').addEventListener('click', () => showRaw(run));

  $('#previous-run').disabled = state.active === 0;
  $('#next-run').disabled = state.active === state.runs.length - 1;
  $('#run-dots').innerHTML = state.runs.map((item, index) => `<button class="${index === state.active ? 'active' : ''}" data-index="${index}" aria-label="View ${escapeHtml(item.model.name)}"></button>`).join('');
  document.querySelectorAll('#run-dots button').forEach((button) => button.addEventListener('click', () => goTo(Number(button.dataset.index))));
  $('#compare-toggle').hidden = state.runs.length < 2;
  if (state.split) renderSplit();
  updateUrl();
}

function renderSplit() {
  const secondaryIndex = state.active === state.runs.length - 1 ? state.active - 1 : state.active + 1;
  const secondary = state.runs[secondaryIndex];
  $('#frame-grid').classList.add('split');
  $('#secondary-frame-wrap').hidden = false;
  $('#secondary-frame').src = secondary.artifacts.displayHtml;
  $('#secondary-label').textContent = `${secondary.model.name} · ${titleCase(secondary.reasoning.normalized)}`;
  $('#compare-toggle').textContent = 'Single view';
}

function goTo(index) {
  if (index < 0 || index >= state.runs.length) return;
  state.active = index;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showRaw(run) {
  const response = await fetch(run.artifacts.rawResponse);
  $('#raw-response').textContent = response.ok ? await response.text() : 'The response record could not be loaded.';
  $('#raw-dialog').showModal();
}

async function init() {
  const response = await fetch('data/runs.json');
  if (!response.ok) throw new Error('Run manifest could not be loaded.');
  const data = await response.json();
  const params = new URLSearchParams(location.search);
  const ids = (params.get('runs') || '').split(',').filter(Boolean);
  state.runs = ids.map((id) => data.runs.find((run) => run.id === id)).filter(Boolean);
  if (!state.runs.length) state.runs = data.runs.slice(0, 1);
  const requestedActive = Number(params.get('active') || 0);
  state.active = Number.isInteger(requestedActive) && requestedActive >= 0 && requestedActive < state.runs.length ? requestedActive : 0;
  render();
}

$('#previous-run').addEventListener('click', () => goTo(state.active - 1));
$('#next-run').addEventListener('click', () => goTo(state.active + 1));
$('#compare-toggle').addEventListener('click', () => {
  state.split = !state.split;
  if (!state.split) {
    $('#frame-grid').classList.remove('split');
    $('#secondary-frame-wrap').hidden = true;
    $('#secondary-frame').src = 'about:blank';
    $('#compare-toggle').textContent = 'Compare two';
  } else renderSplit();
});
$('#fullscreen-toggle').addEventListener('click', () => {
  const panel = $('#artifact-panel');
  const focused = panel.classList.toggle('focused');
  $('#fullscreen-toggle').textContent = focused ? 'Exit focus' : 'Focus view';
});
$('#close-dialog').addEventListener('click', () => $('#raw-dialog').close());
document.addEventListener('keydown', (event) => {
  if ($('#raw-dialog').open) return;
  if (event.key === 'ArrowLeft') goTo(state.active - 1);
  if (event.key === 'ArrowRight') goTo(state.active + 1);
  if (event.key === 'Escape' && $('#artifact-panel').classList.contains('focused')) $('#fullscreen-toggle').click();
});

init().catch((error) => {
  $('#run-title').textContent = error.message;
  $('#artifact-panel').innerHTML = '<div class="empty-state"><span>!</span><h3>Unable to open this walkthrough.</h3><a href="index.html#explorer">Return to the explorer</a></div>';
});
