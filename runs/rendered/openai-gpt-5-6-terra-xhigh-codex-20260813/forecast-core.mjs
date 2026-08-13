/**
 * Small, dependency-free forecasting primitives used by the dashboard.
 * This is an educational geometric-Brownian-motion (GBM) model, not a
 * recommendation or a reliable prediction of future market prices.
 */

export const TRADING_DAYS = 252;

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function quantile(values, percentile) {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * clamp(percentile, 0, 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function sampleStd(values) {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(values.reduce((total, value) => total + (value - average) ** 2, 0) / (values.length - 1));
}

export function calculateMetrics(records) {
  const prices = records.map((record) => Number(record.close)).filter((price) => Number.isFinite(price) && price > 0);
  if (prices.length < 3) throw new Error('At least three valid closing prices are required.');
  const returns = prices.slice(1).map((price, index) => Math.log(price / prices[index]));
  const logReturn = mean(returns) * TRADING_DAYS;
  let peak = prices[0];
  let maxDrawdown = 0;
  for (const price of prices) {
    peak = Math.max(peak, price);
    maxDrawdown = Math.min(maxDrawdown, price / peak - 1);
  }
  return {
    observations: prices.length,
    lastPrice: prices.at(-1),
    annualReturn: Math.exp(logReturn) - 1,
    annualVolatility: sampleStd(returns) * Math.sqrt(TRADING_DAYS),
    totalReturn: prices.at(-1) / prices[0] - 1,
    maxDrawdown,
  };
}

export function seededRandom(seed = 1) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let output = Math.imul(state ^ (state >>> 15), 1 | state);
    output = (output + Math.imul(output ^ (output >>> 7), 61 | output)) ^ output;
    return ((output ^ (output >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalRandom(random = Math.random) {
  let first = random();
  let second = random();
  while (first === 0) first = random();
  while (second === 0) second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

export function forecastGBM(lastPrice, options) {
  const days = Math.round(options.days);
  const simulations = Math.round(options.simulations);
  const annualReturn = clamp(Number(options.annualReturn), -0.99, 10);
  const annualVolatility = clamp(Number(options.annualVolatility), 0, 5);
  const random = options.random || Math.random;
  if (!(lastPrice > 0) || days < 1 || simulations < 1) throw new Error('Invalid forecast inputs.');

  const paths = Array.from({ length: simulations }, () => [lastPrice]);
  const bands = [{ p10: lastPrice, p25: lastPrice, p50: lastPrice, p75: lastPrice, p90: lastPrice }];
  const dailyDrift = (Math.log1p(annualReturn) - 0.5 * annualVolatility ** 2) / TRADING_DAYS;
  const dailyShock = annualVolatility / Math.sqrt(TRADING_DAYS);

  for (let day = 1; day <= days; day += 1) {
    const values = new Array(simulations);
    for (let simulation = 0; simulation < simulations; simulation += 1) {
      const next = paths[simulation][day - 1] * Math.exp(dailyDrift + dailyShock * normalRandom(random));
      paths[simulation].push(next);
      values[simulation] = next;
    }
    bands.push({
      p10: quantile(values, 0.10), p25: quantile(values, 0.25), p50: quantile(values, 0.50),
      p75: quantile(values, 0.75), p90: quantile(values, 0.90),
    });
  }
  const terminalPrices = paths.map((path) => path.at(-1));
  return {
    bands,
    terminalPrices,
    probabilityOfGain: terminalPrices.filter((price) => price > lastPrice).length / simulations,
    expectedTerminal: mean(terminalPrices),
  };
}

// z score for an 80% two-sided interval, used for an out-of-sample sanity check.
const Z_80 = 1.2815515655446004;

export function walkForwardValidation(records, { lookback = 126, horizon = 21, stride = 5 } = {}) {
  if (records.length < lookback + horizon + 1) return null;
  let checked = 0;
  let covered = 0;
  let absoluteError = 0;
  for (let end = lookback; end + horizon < records.length; end += stride) {
    const training = records.slice(end - lookback, end + 1);
    const metrics = calculateMetrics(training);
    const start = Number(records[end].close);
    const actual = Number(records[end + horizon].close);
    const time = horizon / TRADING_DAYS;
    const logMean = Math.log(start) + (Math.log1p(clamp(metrics.annualReturn, -0.99, 10)) - 0.5 * metrics.annualVolatility ** 2) * time;
    const logSpread = metrics.annualVolatility * Math.sqrt(time);
    const lower = Math.exp(logMean - Z_80 * logSpread);
    const upper = Math.exp(logMean + Z_80 * logSpread);
    checked += 1;
    if (actual >= lower && actual <= upper) covered += 1;
    absoluteError += Math.abs(actual / start - Math.exp(logMean) / start);
  }
  return { windows: checked, coverage: covered / checked, meanAbsolutePercentError: absoluteError / checked, targetCoverage: 0.80 };
}

export function nextTradingDates(lastDate, count) {
  const dates = [];
  const current = new Date(`${lastDate}T12:00:00Z`);
  while (dates.length < count) {
    current.setUTCDate(current.getUTCDate() + 1);
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(current.toISOString().slice(0, 10));
  }
  return dates;
}

export function parsePriceCsv(text) {
  const rows = text.trim().split(/\r?\n/);
  if (rows.length < 3) throw new Error('The CSV needs a header and at least two price rows.');
  const splitLine = (line) => {
    const cells = []; let cell = ''; let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"' && line[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = !quoted;
      else if (character === ',' && !quoted) { cells.push(cell.trim()); cell = ''; }
      else cell += character;
    }
    cells.push(cell.trim());
    return cells;
  };
  const normalizeDate = (rawDate) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate || '')) return rawDate;
    const timestamp = Date.parse(rawDate || '');
    return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString().slice(0, 10);
  };
  const headers = splitLine(rows[0]).map((header) => header.trim().toLowerCase().replace(/[ _-]/g, ''));
  const dateIndex = headers.findIndex((header) => ['date', 'timestamp', 'time'].includes(header));
  const closeIndex = headers.findIndex((header) => ['close', 'adjclose', 'adjustedclose', 'price', 'last'].includes(header));
  if (dateIndex < 0 || closeIndex < 0) throw new Error('Use a CSV with Date and Close (or Adj Close) columns.');
  const parsed = rows.slice(1).map((line) => {
    const cells = splitLine(line);
    const rawPrice = cells[closeIndex]?.replace(/[$,]/g, '');
    const rawDate = cells[dateIndex];
    const normalizedDate = normalizeDate(rawDate);
    return { date: normalizedDate, close: Number(rawPrice) };
  }).filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.close) && row.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const deduped = parsed.filter((row, index) => index === 0 || row.date !== parsed[index - 1].date);
  if (deduped.length < 30) throw new Error('Import at least 30 valid daily closing prices.');
  return deduped;
}

export function createDemoData(days = 520) {
  const random = seededRandom(20260813);
  const current = new Date();
  current.setUTCHours(12, 0, 0, 0);
  const dates = [];
  while (dates.length < days) {
    if (current.getUTCDay() !== 0 && current.getUTCDay() !== 6) dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() - 1);
  }
  let price = 4850;
  const records = dates.reverse().map((date, index) => {
    const cyclical = 0.00009 * Math.sin(index / 24);
    price *= Math.exp(0.00024 + cyclical + 0.0105 * normalRandom(random));
    return { date, close: Number(price.toFixed(2)) };
  });
  return records;
}
