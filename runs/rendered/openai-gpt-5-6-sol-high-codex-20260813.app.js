"use strict";

const DEFAULT_DATA = [
  ["2016-08-31",2170.95],["2016-09-30",2168.27],["2016-10-31",2126.15],["2016-11-30",2198.81],["2016-12-30",2238.83],["2017-01-31",2278.87],["2017-02-28",2363.64],["2017-03-31",2362.72],["2017-04-28",2384.20],["2017-05-31",2411.80],["2017-06-30",2423.41],["2017-07-31",2470.30],["2017-08-31",2471.65],["2017-09-29",2519.36],["2017-10-31",2575.26],["2017-11-30",2647.58],["2017-12-29",2673.61],["2018-01-31",2823.81],["2018-02-28",2713.83],["2018-03-29",2640.87],["2018-04-30",2648.05],["2018-05-31",2705.27],["2018-06-29",2718.37],["2018-07-31",2816.29],["2018-08-31",2901.52],["2018-09-28",2913.98],["2018-10-31",2711.74],["2018-11-30",2760.17],["2018-12-31",2506.85],["2019-01-31",2704.10],["2019-02-28",2784.49],["2019-03-29",2834.40],["2019-04-30",2945.83],["2019-05-31",2752.06],["2019-06-28",2941.76],["2019-07-31",2980.38],["2019-08-30",2926.46],["2019-09-30",2976.74],["2019-10-31",3037.56],["2019-11-29",3140.98],["2019-12-31",3230.78],["2020-01-31",3225.52],["2020-02-28",2954.22],["2020-03-31",2584.59],["2020-04-30",2912.43],["2020-05-29",3044.31],["2020-06-30",3100.29],["2020-07-31",3271.12],["2020-08-31",3500.31],["2020-09-30",3363.00],["2020-10-30",3269.96],["2020-11-30",3621.63],["2020-12-31",3756.07],["2021-01-29",3714.24],["2021-02-26",3811.15],["2021-03-31",3972.89],["2021-04-30",4181.17],["2021-05-28",4204.11],["2021-06-30",4297.50],["2021-07-30",4395.26],["2021-08-31",4522.68],["2021-09-30",4307.54],["2021-10-29",4605.38],["2021-11-30",4567.00],["2021-12-31",4766.18],["2022-01-31",4515.55],["2022-02-28",4373.94],["2022-03-31",4530.41],["2022-04-29",4131.93],["2022-05-31",4132.15],["2022-06-30",3785.38],["2022-07-29",4130.29],["2022-08-31",3955.00],["2022-09-30",3585.62],["2022-10-31",3871.98],["2022-11-30",4080.11],["2022-12-30",3839.50],["2023-01-31",4076.60],["2023-02-28",3970.15],["2023-03-31",4109.31],["2023-04-28",4169.48],["2023-05-31",4179.83],["2023-06-30",4450.38],["2023-07-31",4588.96],["2023-08-31",4507.66],["2023-09-29",4288.05],["2023-10-31",4193.80],["2023-11-30",4567.80],["2023-12-29",4769.83],["2024-01-31",4845.65],["2024-02-29",5096.27],["2024-03-28",5254.35],["2024-04-30",5035.69],["2024-05-31",5277.51],["2024-06-28",5460.48],["2024-07-31",5522.30],["2024-08-30",5648.40],["2024-09-30",5762.48],["2024-10-31",5705.45],["2024-11-29",6032.38],["2024-12-31",5881.63],["2025-01-31",6040.53],["2025-02-28",5954.50],["2025-03-31",5611.85],["2025-04-30",5569.06],["2025-05-30",5911.69],["2025-06-30",6204.95],["2025-07-31",6339.39],["2025-08-29",6460.26],["2025-09-30",6688.46],["2025-10-31",6840.20],["2025-11-28",6849.09],["2025-12-31",6845.50],["2026-01-30",6939.03],["2026-02-27",6878.88],["2026-03-31",6528.52],["2026-04-30",7209.01],["2026-05-29",7580.06],["2026-06-30",7499.36],["2026-07-31",7489.72],["2026-08-12",7748.50]
];

const state = {
  data: DEFAULT_DATA.map(([date, close]) => ({ date, close })),
  dataName: "FRED sample",
  horizon: 12,
  lookback: 60,
  adjustment: 0,
  confidence: 0.80,
  simulations: 3000,
  forecast: null,
  chartPoints: [],
  hoverIndex: -1
};

const $ = (selector) => document.querySelector(selector);
const fmtLevel = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fmtDate = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdev(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1));
}

function percentile(sorted, probability) {
  if (!sorted.length) return NaN;
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return sorted[lower + 1] === undefined ? sorted[lower] : sorted[lower] + fraction * (sorted[lower + 1] - sorted[lower]);
}

function mulberry32(seed) {
  return function random() {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function logReturns(points) {
  const result = [];
  for (let i = 1; i < points.length; i += 1) result.push(Math.log(points[i].close / points[i - 1].close));
  return result;
}

function monthEndAfter(dateString, monthsAhead) {
  const date = new Date(`${dateString}T00:00:00Z`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthsAhead + 1, 0)).toISOString().slice(0, 10);
}

function runSimulation(points, horizon, simulationCount, confidence, adjustment, seed = 1701) {
  if (points.length < 13) throw new Error("At least 13 month-end observations are required.");
  const returns = logReturns(points);
  const baseMonthlyMean = mean(returns);
  const residuals = returns.map(value => value - baseMonthlyMean);
  const adjustmentMonthly = Math.log1p(adjustment / 100) / 12;
  const monthlyDrift = baseMonthlyMean + adjustmentMonthly;
  const random = mulberry32(seed + horizon * 31 + simulationCount + Math.round((adjustment + 20) * 10));
  const last = points.at(-1).close;
  const paths = Array.from({ length: simulationCount }, () => new Float64Array(horizon));
  const columns = Array.from({ length: horizon }, () => new Array(simulationCount));

  for (let pathIndex = 0; pathIndex < simulationCount; pathIndex += 1) {
    let level = last;
    for (let month = 0; month < horizon; month += 1) {
      const shock = residuals[Math.floor(random() * residuals.length)];
      level *= Math.exp(monthlyDrift + shock);
      paths[pathIndex][month] = level;
      columns[month][pathIndex] = level;
    }
  }

  const tail = (1 - confidence) / 2;
  const low = [], median = [], high = [];
  columns.forEach(column => {
    column.sort((a, b) => a - b);
    low.push(percentile(column, tail));
    median.push(percentile(column, 0.5));
    high.push(percentile(column, 1 - tail));
  });
  const finalValues = columns.at(-1);
  const probabilityAbove = finalValues.filter(value => value > last).length / simulationCount;

  return {
    low,
    median,
    high,
    paths,
    probabilityAbove,
    monthlyMean: baseMonthlyMean,
    annualDrift: Math.expm1(baseMonthlyMean * 12),
    annualVolatility: stdev(returns) * Math.sqrt(12),
    dates: Array.from({ length: horizon }, (_, index) => monthEndAfter(points.at(-1).date, index + 1))
  };
}

function maxDrawdown(points) {
  let peak = points[0].close;
  let drawdown = 0;
  points.forEach(point => {
    peak = Math.max(peak, point.close);
    drawdown = Math.min(drawdown, point.close / peak - 1);
  });
  return drawdown;
}

function rollingBacktest(data, lookback, confidence) {
  const horizon = 12;
  const firstOrigin = Math.max(lookback, data.length - horizon - 30);
  const results = [];
  for (let origin = firstOrigin; origin <= data.length - horizon - 1; origin += 1) {
    const training = data.slice(Math.max(0, origin - lookback), origin + 1);
    if (training.length < 25) continue;
    const simulation = runSimulation(training, horizon, 350, confidence, 0, 9000 + origin);
    const start = data[origin].close;
    const actual = data[origin + horizon].close;
    const predicted = simulation.median.at(-1);
    results.push({
      error: Math.abs(predicted / actual - 1),
      directionHit: Math.sign(predicted - start) === Math.sign(actual - start),
      covered: actual >= simulation.low.at(-1) && actual <= simulation.high.at(-1)
    });
  }
  return {
    windows: results.length,
    meanAbsoluteError: results.length ? mean(results.map(result => result.error)) : NaN,
    directionRate: results.length ? mean(results.map(result => Number(result.directionHit))) : NaN,
    coverageRate: results.length ? mean(results.map(result => Number(result.covered))) : NaN
  };
}

function selectedHistory() {
  return state.data.slice(-(Math.min(state.lookback, state.data.length - 1) + 1));
}

function formatPercent(value, signed = false, digits = 1) {
  if (!Number.isFinite(value)) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

function shortDate(dateString) {
  return fmtDate.format(new Date(`${dateString}T00:00:00Z`));
}

function updateRangeFill(input) {
  const fill = ((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
  input.style.setProperty("--fill", `${fill}%`);
}

function updateDashboard() {
  const history = selectedHistory();
  state.forecast = runSimulation(history, state.horizon, state.simulations, state.confidence, state.adjustment);
  const backtest = rollingBacktest(state.data, state.lookback, state.confidence);
  const last = state.data.at(-1);
  const trailingPoint = state.data.at(-13) || state.data[0];
  const medianEnd = state.forecast.median.at(-1);
  const lowEnd = state.forecast.low.at(-1);
  const highEnd = state.forecast.high.at(-1);

  $("#asOfLabel").textContent = `AS OF ${shortDate(last.date).toUpperCase()}`;
  $("#lastClose").textContent = fmtLevel.format(last.close);
  $("#lastDate").textContent = `Close · ${shortDate(last.date)}`;
  $("#trailingReturn").textContent = formatPercent(last.close / trailingPoint.close - 1, true);
  $("#trailingReturn").classList.toggle("negative", last.close < trailingPoint.close);
  $("#realizedVol").textContent = formatPercent(state.forecast.annualVolatility);
  $("#baseDrift").textContent = formatPercent(state.forecast.annualDrift, true);
  $("#medianEnd").textContent = fmtLevel.format(medianEnd);
  $("#medianReturn").textContent = `${formatPercent(medianEnd / last.close - 1, true)} from today`;
  $("#rangeEnd").textContent = `${fmtLevel.format(lowEnd)}–${fmtLevel.format(highEnd)}`;
  $("#rangeCaption").textContent = `${Math.round(state.confidence * 100)}% simulated interval`;
  $("#probAbove").textContent = formatPercent(state.forecast.probabilityAbove, false, 0);
  $("#maxDrawdown").textContent = formatPercent(maxDrawdown(history));
  $("#legendInterval").textContent = `${Math.round(state.confidence * 100)}%`;
  $("#horizonPill").textContent = `${state.horizon} MONTH VIEW`;
  $("#backtestError").textContent = formatPercent(backtest.meanAbsoluteError);
  $("#directionRate").textContent = formatPercent(backtest.directionRate, false, 0);
  $("#coverageRate").textContent = formatPercent(backtest.coverageRate, false, 0);
  $("#coverageCaption").textContent = `Inside ${Math.round(state.confidence * 100)}% range`;
  $("#testWindows").textContent = String(backtest.windows);
  $("#dataTitle").textContent = state.dataName;
  $("#dataSubtitle").textContent = `${state.data.length} month-end closes`;
  drawChart();
}

function niceStep(span, targetTicks = 5) {
  const rough = span / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const nice = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
  return nice * magnitude;
}

function drawChart() {
  const canvas = $("#forecastChart");
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  const width = rect.width, height = rect.height;
  const padding = { top: 18, right: 16, bottom: 34, left: 57 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const history = selectedHistory();
  const forecast = state.forecast;
  const combined = history.map(point => point.close).concat(forecast.low, forecast.high);
  let yMin = Math.min(...combined), yMax = Math.max(...combined);
  const margin = (yMax - yMin) * 0.09;
  yMin -= margin; yMax += margin;
  const step = niceStep(yMax - yMin);
  yMin = Math.floor(yMin / step) * step;
  yMax = Math.ceil(yMax / step) * step;
  const totalIntervals = history.length - 1 + state.horizon;
  const splitIndex = history.length - 1;
  const x = index => padding.left + (index / totalIntervals) * plotWidth;
  const y = value => padding.top + ((yMax - value) / (yMax - yMin)) * plotHeight;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(26,139,123,.035)";
  ctx.fillRect(x(splitIndex), padding.top, width - padding.right - x(splitIndex), plotHeight);

  ctx.font = '10px "DM Sans", sans-serif';
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let value = yMin; value <= yMax + step / 2; value += step) {
    const yPos = y(value);
    ctx.strokeStyle = "#e3e2da";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padding.left, yPos); ctx.lineTo(width - padding.right, yPos); ctx.stroke();
    ctx.fillStyle = "#73827f";
    ctx.fillText(fmtLevel.format(value), padding.left - 9, yPos);
  }

  ctx.beginPath();
  forecast.high.forEach((value, index) => {
    const px = x(splitIndex + index + 1), py = y(value);
    if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  for (let index = forecast.low.length - 1; index >= 0; index -= 1) ctx.lineTo(x(splitIndex + index + 1), y(forecast.low[index]));
  ctx.closePath();
  const bandGradient = ctx.createLinearGradient(x(splitIndex), 0, width - padding.right, 0);
  bandGradient.addColorStop(0, "rgba(26,139,123,.22)"); bandGradient.addColorStop(1, "rgba(26,139,123,.08)");
  ctx.fillStyle = bandGradient; ctx.fill();

  ctx.strokeStyle = "#102724"; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath();
  history.forEach((point, index) => { if (index === 0) ctx.moveTo(x(index), y(point.close)); else ctx.lineTo(x(index), y(point.close)); });
  ctx.stroke();

  ctx.strokeStyle = "#ef735c"; ctx.lineWidth = 2.5; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x(splitIndex), y(history.at(-1).close));
  forecast.median.forEach((value, index) => ctx.lineTo(x(splitIndex + index + 1), y(value)));
  ctx.stroke();

  ctx.strokeStyle = "rgba(16,39,36,.28)"; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(x(splitIndex), padding.top); ctx.lineTo(x(splitIndex), height - padding.bottom); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "#ef735c"; ctx.beginPath(); ctx.arc(x(splitIndex), y(history.at(-1).close), 4.5, 0, Math.PI * 2); ctx.fill();

  const labels = [];
  const allDates = history.map(point => point.date).concat(forecast.dates);
  const labelCount = width < 600 ? 4 : 6;
  for (let index = 0; index <= labelCount; index += 1) labels.push(Math.round((totalIntervals * index) / labelCount));
  ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = "#73827f";
  labels.forEach(index => ctx.fillText(shortDate(allDates[index]), x(index), height - padding.bottom + 11));

  state.chartPoints = history.map((point, index) => ({ x: x(index), y: y(point.close), date: point.date, value: point.close, type: "Observed" }));
  state.chartPoints.push(...forecast.median.map((value, index) => ({
    x: x(splitIndex + index + 1), y: y(value), date: forecast.dates[index], value,
    low: forecast.low[index], high: forecast.high[index], type: "Forecast median"
  })));

  if (state.hoverIndex >= 0 && state.chartPoints[state.hoverIndex]) {
    const point = state.chartPoints[state.hoverIndex];
    ctx.strokeStyle = "rgba(16,39,36,.25)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(point.x, padding.top); ctx.lineTo(point.x, height - padding.bottom); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = point.type === "Observed" ? "#102724" : "#ef735c";
    ctx.beginPath(); ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2); ctx.fill();
  }
}

function chartPointer(event) {
  const canvas = $("#forecastChart");
  const bounds = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const localX = clientX - bounds.left;
  let nearest = -1, distance = Infinity;
  state.chartPoints.forEach((point, index) => {
    const current = Math.abs(point.x - localX);
    if (current < distance) { nearest = index; distance = current; }
  });
  if (nearest < 0 || distance > 25) { clearTooltip(); return; }
  state.hoverIndex = nearest;
  const point = state.chartPoints[nearest];
  const tooltip = $("#chartTooltip");
  tooltip.innerHTML = `<span>${point.type} · ${shortDate(point.date)}</span><strong>${fmtLevel.format(point.value)}</strong>${point.low ? `<span>Range ${fmtLevel.format(point.low)}–${fmtLevel.format(point.high)}</span>` : ""}`;
  tooltip.hidden = false;
  tooltip.style.left = `${Math.min(Math.max(point.x, 85), bounds.width - 85)}px`;
  tooltip.style.top = `${Math.max(point.y, 62)}px`;
  drawChart();
}

function clearTooltip() {
  state.hoverIndex = -1;
  $("#chartTooltip").hidden = true;
  drawChart();
}

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).map(line => line.split(",").map(cell => cell.trim().replace(/^"|"$/g, "")));
  if (rows.length < 14) throw new Error("The CSV needs at least 13 valid observations plus a header.");
  const headers = rows[0].map(header => header.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const dateIndex = headers.findIndex(header => ["date", "observationdate", "timestamp"].includes(header));
  let closeIndex = headers.findIndex(header => ["close", "adjclose", "sp500", "price", "value"].includes(header));
  if (dateIndex < 0) throw new Error("No date column found. Use a column named date.");
  if (closeIndex < 0) closeIndex = headers.findIndex((_, index) => index !== dateIndex);
  if (closeIndex < 0) throw new Error("No close column found. Use a column named close.");
  const parsed = rows.slice(1).map(row => ({ date: row[dateIndex], close: Number(String(row[closeIndex]).replace(/[$,]/g, "")) }))
    .filter(point => /^\d{4}-\d{2}-\d{2}$/.test(point.date) && Number.isFinite(point.close) && point.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const monthMap = new Map();
  parsed.forEach(point => monthMap.set(point.date.slice(0, 7), point));
  const monthly = [...monthMap.values()];
  if (monthly.length < 13) throw new Error("Fewer than 13 valid month-end observations were found.");
  return monthly;
}

function downloadForecast() {
  const last = state.data.at(-1);
  const rows = [["date", "median", "lower", "upper", "interval"]];
  rows.push([last.date, last.close.toFixed(2), last.close.toFixed(2), last.close.toFixed(2), "observed"]);
  state.forecast.dates.forEach((date, index) => rows.push([
    date,
    state.forecast.median[index].toFixed(2),
    state.forecast.low[index].toFixed(2),
    state.forecast.high[index].toFixed(2),
    `${Math.round(state.confidence * 100)}%`
  ]));
  const blob = new Blob([rows.map(row => row.join(",")).join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `sp500-scenario-${last.date}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Forecast CSV exported");
}

let toastTimer;
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function syncControls() {
  $("#horizon").value = state.horizon;
  $("#driftAdjustment").value = state.adjustment;
  $("#confidence").value = state.confidence.toFixed(2);
  $("#simulations").value = String(state.simulations);
  $("#horizonOutput").textContent = `${state.horizon} mo`;
  $("#driftOutput").textContent = `${state.adjustment >= 0 ? "+" : ""}${state.adjustment.toFixed(1)}%`;
  updateRangeFill($("#horizon")); updateRangeFill($("#driftAdjustment"));
  document.querySelectorAll("#lookbackGroup button").forEach(button => button.classList.toggle("active", Number(button.dataset.value) === state.lookback));
  document.querySelectorAll(".scenario-buttons button").forEach(button => button.classList.toggle("active", Number(button.dataset.drift) === state.adjustment));
}

function bindEvents() {
  $("#horizon").addEventListener("input", event => { state.horizon = Number(event.target.value); syncControls(); });
  $("#horizon").addEventListener("change", updateDashboard);
  $("#driftAdjustment").addEventListener("input", event => { state.adjustment = Number(event.target.value); syncControls(); });
  $("#driftAdjustment").addEventListener("change", updateDashboard);
  $("#lookbackGroup").addEventListener("click", event => {
    const button = event.target.closest("button"); if (!button) return;
    state.lookback = Number(button.dataset.value); syncControls(); updateDashboard();
  });
  document.querySelector(".scenario-buttons").addEventListener("click", event => {
    const button = event.target.closest("button"); if (!button) return;
    state.adjustment = Number(button.dataset.drift); syncControls(); updateDashboard();
  });
  $("#confidence").addEventListener("change", event => { state.confidence = Number(event.target.value); updateDashboard(); });
  $("#simulations").addEventListener("change", event => { state.simulations = Number(event.target.value); updateDashboard(); });
  $("#runButton").addEventListener("click", () => { updateDashboard(); showToast(`${fmtLevel.format(state.simulations)} paths simulated`); });
  $("#resetButton").addEventListener("click", () => {
    Object.assign(state, { data: DEFAULT_DATA.map(([date, close]) => ({ date, close })), dataName: "FRED sample", horizon: 12, lookback: 60, adjustment: 0, confidence: .8, simulations: 3000 });
    syncControls(); updateDashboard(); showToast("Defaults restored");
  });
  $("#csvInput").addEventListener("change", async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const monthly = parseCsv(await file.text());
      state.data = monthly; state.dataName = file.name;
      if (state.lookback >= monthly.length) state.lookback = [120, 60, 36].find(value => value < monthly.length) || monthly.length - 1;
      syncControls(); updateDashboard(); showToast(`Loaded ${monthly.length} month-end closes`);
    } catch (error) { showToast(error.message); }
    event.target.value = "";
  });
  $("#exportButton").addEventListener("click", downloadForecast);
  $("#methodButton").addEventListener("click", () => $("#methodDialog").showModal());
  const canvas = $("#forecastChart");
  canvas.addEventListener("mousemove", chartPointer);
  canvas.addEventListener("touchmove", chartPointer, { passive: true });
  canvas.addEventListener("mouseleave", clearTooltip);
  window.addEventListener("resize", drawChart);
}

function init() {
  bindEvents();
  syncControls();
  updateDashboard();
}

window.NorthstarModel = { mean, stdev, percentile, mulberry32, logReturns, runSimulation, maxDrawdown, rollingBacktest, parseCsv, monthEndAfter, DEFAULT_DATA };

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
