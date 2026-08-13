const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = {
  console,
  Float64Array,
  Intl,
  Math,
  Map,
  Date,
  Number,
  String,
  Array,
  document: { readyState: "loading", addEventListener() {} },
  window: { addEventListener() {}, devicePixelRatio: 1 }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("app.js", "utf8"), context, { filename: "app.js" });

const model = context.window.NorthstarModel;
const points = model.DEFAULT_DATA.map(([date, close]) => ({ date, close }));

assert.equal(points.length, 121, "embedded sample should contain 121 month-end closes");
assert.equal(points.at(-1).date, "2026-08-12", "sample as-of date should be explicit");
assert.equal(model.monthEndAfter("2026-08-12", 1), "2026-09-30", "month arithmetic should return month-end dates");

const result = model.runSimulation(points.slice(-61), 12, 1000, 0.8, 0, 42);
const repeated = model.runSimulation(points.slice(-61), 12, 1000, 0.8, 0, 42);
assert.equal(result.median.length, 12);
assert.deepEqual(result.median, repeated.median, "simulation must be deterministic for a fixed seed");
result.median.forEach((value, index) => {
  assert.ok(Number.isFinite(value) && value > 0, "forecast levels must be finite and positive");
  assert.ok(result.low[index] <= value && value <= result.high[index], "median must remain inside its interval");
});
assert.ok(result.probabilityAbove >= 0 && result.probabilityAbove <= 1);
assert.ok(result.annualVolatility > 0);

const bearish = model.runSimulation(points.slice(-61), 12, 1000, 0.8, -8, 42);
const bullish = model.runSimulation(points.slice(-61), 12, 1000, 0.8, 8, 42);
assert.ok(bearish.median.at(-1) < result.median.at(-1));
assert.ok(result.median.at(-1) < bullish.median.at(-1));

const parsed = model.parseCsv("date,close\n" + points.slice(0, 14).map(point => `${point.date},${point.close}`).join("\n"));
assert.equal(parsed.length, 14);
assert.throws(() => model.parseCsv("when,value\n2024-01-01,1\n"), /at least 13/i);

const backtest = model.rollingBacktest(points, 60, 0.8);
assert.ok(backtest.windows >= 20, "backtest should evaluate multiple independent origins");
assert.ok(Number.isFinite(backtest.meanAbsoluteError));
assert.ok(backtest.directionRate >= 0 && backtest.directionRate <= 1);
assert.ok(backtest.coverageRate >= 0 && backtest.coverageRate <= 1);

console.log("model.test.js: all assertions passed");
