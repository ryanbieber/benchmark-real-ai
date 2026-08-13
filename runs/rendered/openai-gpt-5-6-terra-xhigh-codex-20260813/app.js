import {
  calculateMetrics, createDemoData, forecastGBM, nextTradingDates, parsePriceCsv,
  quantile, seededRandom, walkForwardValidation,
} from './forecast-core.mjs';

const $ = (selector) => document.querySelector(selector);
const formatPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const formatNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const percent = (value, digits = 1) => `${(value * 100).toFixed(digits)}%`;

const state = {
  data: createDemoData(),
  source: 'Built-in illustrative series',
  result: null,
  metrics: null,
  forecastDates: [],
  isFirstDataset: true,
};

function setStatus(message, type = 'quiet') {
  const status = $('#data-status');
  status.textContent = message;
  status.dataset.type = type;
}

function value(id) { return Number($(id).value); }

function modelOptions() {
  return {
    days: value('#horizon'),
    simulations: value('#simulations'),
    annualReturn: value('#annual-return') / 100,
    annualVolatility: value('#annual-volatility') / 100,
  };
}

function seedForCurrentModel() {
  const input = `${state.data.at(-1).date}|${JSON.stringify(modelOptions())}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
  return hash >>> 0;
}

function updateControlLabels() {
  $('#horizon-value').textContent = `${value('#horizon')} trading days`;
  $('#simulations-value').textContent = `${formatNumber.format(value('#simulations'))} paths`;
}

function applyHistoricalInputs() {
  const history = state.data.slice(-value('#lookback'));
  const metrics = calculateMetrics(history);
  $('#annual-return').value = (metrics.annualReturn * 100).toFixed(1);
  $('#annual-volatility').value = (metrics.annualVolatility * 100).toFixed(1);
  updateForecast();
}

function renderDatasetSummary() {
  const metrics = calculateMetrics(state.data);
  state.metrics = metrics;
  $('#last-close').textContent = formatPrice.format(metrics.lastPrice);
  $('#last-date').textContent = `Last close: ${formatDate(state.data.at(-1).date)}`;
  $('#dataset-source').textContent = state.source;
  const lookback = state.data.slice(-value('#lookback'));
  const historic = calculateMetrics(lookback);
  $('#history-return').textContent = percent(historic.annualReturn);
  $('#history-volatility').textContent = percent(historic.annualVolatility);
  $('#history-note').textContent = `Based on the last ${lookback.length} sessions`;
}

function updateForecast() {
  if (!state.data.length) return;
  updateControlLabels();
  renderDatasetSummary();
  const options = modelOptions();
  state.forecastDates = nextTradingDates(state.data.at(-1).date, options.days);
  state.result = forecastGBM(state.metrics.lastPrice, { ...options, random: seededRandom(seedForCurrentModel()) });
  renderOutputs();
  drawAll();
}

function renderOutputs() {
  const { result, metrics } = state;
  const finalBand = result.bands.at(-1);
  const expectedReturn = result.expectedTerminal / metrics.lastPrice - 1;
  $('#median-price').textContent = formatPrice.format(finalBand.p50);
  $('#median-return').textContent = `${percent(finalBand.p50 / metrics.lastPrice - 1)} median outcome`;
  $('#range-price').textContent = `${formatPrice.format(finalBand.p10)} – ${formatPrice.format(finalBand.p90)}`;
  $('#range-caption').textContent = 'Central 80% of simulated outcomes';
  $('#gain-probability').textContent = percent(result.probabilityOfGain, 0);
  $('#gain-caption').textContent = `Simulated chance of ending above ${formatPrice.format(metrics.lastPrice)}`;
  $('#expected-return').textContent = percent(expectedReturn);
  $('#expected-caption').textContent = 'Mean of all simulated end values';

  const horizon = value('#horizon') / 252;
  const annualReturn = value('#annual-return') / 100;
  const volatility = value('#annual-volatility') / 100;
  const scenarios = [
    ['Bear', annualReturn - volatility * 0.75, 'scenario-bear'],
    ['Base', annualReturn, 'scenario-base'],
    ['Bull', annualReturn + volatility * 0.75, 'scenario-bull'],
  ];
  $('#scenarios').innerHTML = scenarios.map(([label, rate, className]) => {
    const outcome = metrics.lastPrice * Math.exp(Math.log1p(Math.max(rate, -0.99)) * horizon);
    return `<article class="scenario ${className}"><span>${label}</span><strong>${formatPrice.format(outcome)}</strong><small>${percent(outcome / metrics.lastPrice - 1)} over selected horizon</small></article>`;
  }).join('');

  const validation = walkForwardValidation(state.data, { lookback: Math.min(value('#lookback'), 252), horizon: 21, stride: 5 });
  if (validation) {
    $('#validation-value').textContent = percent(validation.coverage, 0);
    $('#validation-detail').textContent = `${validation.windows} rolling 21-session checks · target ${percent(validation.targetCoverage, 0)} · mean error ${percent(validation.meanAbsolutePercentError)}`;
  } else {
    $('#validation-value').textContent = '—';
    $('#validation-detail').textContent = 'Import more history to run rolling validation.';
  }
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

function canvasContext(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function line(ctx, points, color, width = 2, dash = []) {
  ctx.save();
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.stroke(); ctx.restore();
}

function fillBand(ctx, upper, lower, color) {
  ctx.save(); ctx.beginPath();
  upper.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  [...lower].reverse().forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
}

function drawForecastChart() {
  const canvas = $('#forecast-chart');
  const { ctx, width, height } = canvasContext(canvas);
  const pad = { top: 20, right: 18, bottom: 36, left: 62 };
  const history = state.data.slice(-Math.min(160, state.data.length));
  const bands = state.result.bands;
  const values = [
    ...history.map((row) => row.close), ...bands.map((band) => band.p10), ...bands.map((band) => band.p90),
  ];
  const min = Math.min(...values) * 0.985;
  const max = Math.max(...values) * 1.015;
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const totalPoints = history.length - 1 + bands.length - 1;
  const x = (index) => pad.left + (index / totalPoints) * plotWidth;
  const y = (price) => pad.top + (max - price) / (max - min) * plotHeight;
  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px Inter, system-ui, sans-serif'; ctx.textBaseline = 'middle';
  for (let tick = 0; tick <= 4; tick += 1) {
    const price = min + (max - min) * tick / 4;
    const yy = y(price);
    ctx.strokeStyle = '#dbe3ef'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.left, yy); ctx.lineTo(width - pad.right, yy); ctx.stroke();
    ctx.fillStyle = '#65738a'; ctx.textAlign = 'right'; ctx.fillText(formatPrice.format(price), pad.left - 9, yy);
  }
  const historyPoints = history.map((row, index) => [x(index), y(row.close)]);
  const forecastOffset = history.length - 1;
  const forecastPoints = (key) => bands.map((band, index) => [x(forecastOffset + index), y(band[key])]);
  fillBand(ctx, forecastPoints('p90'), forecastPoints('p10'), 'rgba(103, 89, 226, .13)');
  fillBand(ctx, forecastPoints('p75'), forecastPoints('p25'), 'rgba(103, 89, 226, .24)');
  line(ctx, historyPoints, '#17213b', 2.4);
  line(ctx, forecastPoints('p50'), '#6759e2', 2.5);
  ctx.strokeStyle = '#9ba7bc'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x(forecastOffset), pad.top); ctx.lineTo(x(forecastOffset), height - pad.bottom); ctx.stroke(); ctx.setLineDash([]);
  const labels = [history[0].date, history[Math.floor(history.length / 2)].date, history.at(-1).date, state.forecastDates[Math.floor(state.forecastDates.length / 2)], state.forecastDates.at(-1)];
  const labelX = [x(0), x(Math.floor(history.length / 2)), x(forecastOffset), x(forecastOffset + Math.floor(bands.length / 2)), x(totalPoints)];
  ctx.fillStyle = '#65738a'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  labels.forEach((label, index) => ctx.fillText(formatDate(label).replace(/, \d{4}/, ''), labelX[index], height - pad.bottom + 12));
  canvas._chartMeta = { x, y, history, bands, forecastOffset, min, max, pad, width, height };
}

function drawDistribution() {
  const canvas = $('#distribution-chart');
  const { ctx, width, height } = canvasContext(canvas);
  const pad = { top: 17, right: 15, bottom: 31, left: 35 };
  const prices = state.result.terminalPrices;
  const min = Math.min(...prices); const max = Math.max(...prices);
  const count = 22; const bins = Array(count).fill(0);
  prices.forEach((price) => { const index = Math.min(count - 1, Math.floor((price - min) / (max - min || 1) * count)); bins[index] += 1; });
  const highest = Math.max(...bins); const chartHeight = height - pad.top - pad.bottom; const chartWidth = width - pad.left - pad.right;
  ctx.clearRect(0, 0, width, height);
  bins.forEach((bin, index) => {
    const barWidth = chartWidth / count - 2;
    const barHeight = bin / highest * chartHeight;
    ctx.fillStyle = '#8a7ff1'; ctx.fillRect(pad.left + index * chartWidth / count + 1, pad.top + chartHeight - barHeight, barWidth, barHeight);
  });
  const currentX = pad.left + (state.metrics.lastPrice - min) / (max - min || 1) * chartWidth;
  ctx.strokeStyle = '#17213b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(currentX, pad.top); ctx.lineTo(currentX, pad.top + chartHeight); ctx.stroke();
  ctx.font = '12px Inter, system-ui, sans-serif'; ctx.fillStyle = '#65738a'; ctx.textBaseline = 'top';
  ctx.textAlign = 'left'; ctx.fillText(formatPrice.format(min), pad.left, height - 20);
  ctx.textAlign = 'right'; ctx.fillText(formatPrice.format(max), width - pad.right, height - 20);
}

function drawAll() { drawForecastChart(); drawDistribution(); }

function handleChartHover(event) {
  const meta = $('#forecast-chart')._chartMeta;
  if (!meta) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const relativeX = event.clientX - rect.left;
  const index = Math.round((relativeX - meta.pad.left) / (meta.width - meta.pad.left - meta.pad.right) * (meta.history.length - 1 + meta.bands.length - 1));
  const tooltip = $('#chart-tooltip');
  if (index < 0 || index > meta.history.length - 1 + meta.bands.length - 1) { tooltip.hidden = true; return; }
  let date; let text;
  if (index < meta.history.length) {
    const row = meta.history[index]; date = row.date; text = `Close ${formatPrice.format(row.close)}`;
  } else {
    const forecastIndex = index - meta.forecastOffset; const band = meta.bands[forecastIndex]; date = forecastIndex ? state.forecastDates[forecastIndex - 1] : state.data.at(-1).date;
    text = `P50 ${formatPrice.format(band.p50)} · 80% ${formatPrice.format(band.p10)}–${formatPrice.format(band.p90)}`;
  }
  tooltip.innerHTML = `<strong>${formatDate(date)}</strong><br>${text}`;
  tooltip.hidden = false;
  tooltip.style.left = `${Math.min(Math.max(relativeX + 12, 8), rect.width - 220)}px`;
  tooltip.style.top = `${Math.max(event.clientY - rect.top - 62, 8)}px`;
}

function importCsv(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = parsePriceCsv(String(reader.result));
      state.data = imported; state.source = `Imported CSV · ${file.name}`; state.isFirstDataset = false;
      setStatus(`Imported ${formatNumber.format(imported.length)} daily prices.`, 'success');
      updateForecast();
    } catch (error) { setStatus(error.message, 'error'); }
  };
  reader.readAsText(file);
}

async function loadLiveData({ manual = false } = {}) {
  const button = $('#live-data');
  button.disabled = true; button.textContent = 'Refreshing…'; setStatus('Fetching daily S&P 500 index data…');
  const endpoints = [
    'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=5y&interval=1d&events=history',
    'https://query2.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=5y&interval=1d&events=history',
  ];
  try {
    let response;
    for (const endpoint of endpoints) {
      try { const candidate = await fetch(endpoint, { cache: 'no-store' }); if (candidate.ok) { response = candidate; break; } } catch { /* Try the alternate endpoint. */ }
    }
    if (!response) throw new Error('The public data endpoint is not available from this browser right now.');
    const payload = await response.json();
    const chart = payload.chart?.result?.[0];
    const rows = chart?.timestamp?.map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10), close: chart.indicators.quote[0].close[index],
    })).filter((row) => Number.isFinite(row.close) && row.close > 0) || [];
    if (rows.length < 30) throw new Error('The data endpoint returned too few valid prices.');
    state.data = rows; state.source = 'Yahoo Finance · ^GSPC daily closes'; state.isFirstDataset = false;
    setStatus(`Live data loaded: ${formatNumber.format(rows.length)} daily S&P 500 closes.`, 'success');
    updateForecast();
  } catch (error) {
    setStatus(`${error.message} You can still import a CSV from your chosen provider.`, manual ? 'error' : 'quiet');
  } finally { button.disabled = false; button.textContent = 'Refresh market data'; }
}

function setupEvents() {
  ['#horizon', '#simulations', '#lookback', '#annual-return', '#annual-volatility'].forEach((selector) => {
    $(selector).addEventListener('input', () => window.requestAnimationFrame(updateForecast));
    $(selector).addEventListener('change', () => window.requestAnimationFrame(updateForecast));
  });
  $('#use-history').addEventListener('click', applyHistoricalInputs);
  $('#run-forecast').addEventListener('click', updateForecast);
  $('#live-data').addEventListener('click', () => loadLiveData({ manual: true }));
  $('#csv-upload').addEventListener('change', (event) => { if (event.target.files?.[0]) importCsv(event.target.files[0]); });
  $('#use-demo').addEventListener('click', () => {
    state.data = createDemoData(); state.source = 'Built-in illustrative series'; state.isFirstDataset = false;
    setStatus('Illustrative offline series restored. It is not live market data.', 'quiet'); updateForecast();
  });
  $('#forecast-chart').addEventListener('mousemove', handleChartHover);
  $('#forecast-chart').addEventListener('mouseleave', () => { $('#chart-tooltip').hidden = true; });
  window.addEventListener('resize', () => window.requestAnimationFrame(drawAll));
}

setupEvents();
renderDatasetSummary();
applyHistoricalInputs();
loadLiveData();
