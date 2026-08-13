import assert from 'node:assert/strict';
import {
  calculateMetrics, createDemoData, forecastGBM, nextTradingDates, parsePriceCsv, seededRandom, walkForwardValidation,
} from '../forecast-core.mjs';

const records = createDemoData(400);
assert.equal(records.length, 400);
assert.ok(records.every((row, index) => row.close > 0 && (index === 0 || row.date > records[index - 1].date)));
const metrics = calculateMetrics(records);
assert.ok(metrics.lastPrice > 0 && Number.isFinite(metrics.annualVolatility));
const result = forecastGBM(metrics.lastPrice, { days: 63, simulations: 1000, annualReturn: 0.08, annualVolatility: 0.18, random: seededRandom(7) });
assert.equal(result.bands.length, 64);
assert.equal(result.terminalPrices.length, 1000);
assert.ok(result.bands.at(-1).p10 < result.bands.at(-1).p50 && result.bands.at(-1).p50 < result.bands.at(-1).p90);
assert.ok(result.probabilityOfGain >= 0 && result.probabilityOfGain <= 1);
assert.deepEqual(nextTradingDates('2026-08-14', 2), ['2026-08-17', '2026-08-18']);
const csv = parsePriceCsv('Date,Close\n2026-01-02,"1,100"\n2026-01-03,1101\n' + Array.from({ length: 29 }, (_, i) => `2026-02-${String(i + 1).padStart(2, '0')},${1102 + i}`).join('\n'));
assert.equal(csv.length, 31);
assert.equal(csv[0].close, 1100);
const validation = walkForwardValidation(records, { lookback: 126, horizon: 21 });
assert.ok(validation && validation.windows > 0 && validation.coverage >= 0 && validation.coverage <= 1);
console.log('forecast-core tests passed');
