(function () {
  'use strict';

  var DEFAULTS = {
    model: 'ensemble',
    horizon: 60,
    confidence: 90,
    lookback: 756,
    scenario: 'base',
    chartRange: 756
  };

  var state = Object.assign({}, DEFAULTS);
  var bundledData = normalizeData(window.SP500_DATA || []);
  var data = bundledData.slice();
  var dataMeta = Object.assign({}, window.SP500_DATA_META || {});
  var activeForecast = null;
  var activeBacktest = null;
  var chartHitPoints = [];
  var toastTimer = null;

  var number0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  var number1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var dateLong = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  var dateShort = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  var monthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function clamp(value, low, high) { return Math.min(high, Math.max(low, value)); }
  function mean(values) { return values.length ? values.reduce(function (sum, value) { return sum + value; }, 0) / values.length : 0; }
  function stdev(values) {
    if (values.length < 2) return 0;
    var average = mean(values);
    return Math.sqrt(values.reduce(function (sum, value) { return sum + Math.pow(value - average, 2); }, 0) / (values.length - 1));
  }
  function median(values) {
    if (!values.length) return 0;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  function parseDate(value) { return new Date(String(value).slice(0, 10) + 'T00:00:00Z'); }
  function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(parseDate(value).getTime()); }
  function formatDate(value) { return dateLong.format(parseDate(value)); }
  function formatShortDate(value) { return dateShort.format(parseDate(value)); }
  function formatIndex(value) { return number0.format(value); }
  function formatPct(value, digits) {
    var sign = value > 0 ? '+' : '';
    return sign + (digits === 0 ? number0.format(value * 100) : number1.format(value * 100)) + '%';
  }
  function zScore(confidence) { return confidence === 80 ? 1.2816 : confidence === 95 ? 1.96 : 1.6449; }
  function scenarioRate(name) { return name === 'bull' ? 0.08 : name === 'bear' ? -0.08 : 0; }
  function normalizeData(rows) {
    var byDate = {};
    rows.forEach(function (row) {
      var date = Array.isArray(row) ? String(row[0]).slice(0, 10) : String(row.date || '').slice(0, 10);
      var close = Number(Array.isArray(row) ? row[1] : row.close);
      if (validDate(date) && isFinite(close) && close > 0) byDate[date] = { date: date, close: close };
    });
    return Object.keys(byDate).sort().map(function (date) { return byDate[date]; });
  }
  function nextTradingDates(date, count) {
    var cursor = parseDate(date);
    var dates = [];
    while (dates.length < count) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      var day = cursor.getUTCDay();
      if (day !== 0 && day !== 6) dates.push(cursor.toISOString().slice(0, 10));
    }
    return dates;
  }
  function decaySum(days, factor) {
    return factor === 1 ? days : factor * (1 - Math.pow(factor, days)) / (1 - factor);
  }

  function calculateSignals(series, lookback) {
    var available = Math.min(lookback, series.length - 1);
    var start = Math.max(0, series.length - available - 1);
    var sample = series.slice(start);
    var logs = sample.map(function (point) { return Math.log(point.close); });
    var returns = [];
    for (var i = 1; i < logs.length; i += 1) returns.push(logs[i] - logs[i - 1]);
    var cleanReturns = returns.map(function (value) { return clamp(value, -0.08, 0.08); });
    var structuralAnn = clamp(mean(cleanReturns) * 252, -0.25, 0.30);

    var trendLength = Math.min(252, logs.length);
    var trendLogs = logs.slice(logs.length - trendLength);
    var xMean = (trendLength - 1) / 2;
    var yMean = mean(trendLogs);
    var numerator = 0;
    var denominator = 0;
    trendLogs.forEach(function (value, index) {
      numerator += (index - xMean) * (value - yMean);
      denominator += Math.pow(index - xMean, 2);
    });
    var trendAnn = clamp((denominator ? numerator / denominator : 0) * 252, -0.45, 0.45);

    function annualizedMomentum(days) {
      var actualDays = Math.min(days, series.length - 1);
      if (actualDays < 2) return 0;
      var latest = series[series.length - 1].close;
      var earlier = series[series.length - 1 - actualDays].close;
      return clamp(Math.log(latest / earlier) * 252 / actualDays, -0.55, 0.55);
    }
    var momentumAnn = clamp(
      0.45 * annualizedMomentum(21) +
      0.35 * annualizedMomentum(63) +
      0.20 * annualizedMomentum(252),
      -0.45,
      0.45
    );

    var holtLogs = logs.slice(Math.max(0, logs.length - 504));
    var level = holtLogs[0];
    var trend = holtLogs.length > 5 ? (holtLogs[5] - holtLogs[0]) / 5 : 0;
    var alpha = 0.18;
    var beta = 0.035;
    for (var h = 1; h < holtLogs.length; h += 1) {
      var oldLevel = level;
      level = alpha * holtLogs[h] + (1 - alpha) * (level + trend);
      trend = beta * (level - oldLevel) + (1 - beta) * trend;
    }
    var holtTrendAnn = clamp(trend * 252, -0.45, 0.45);
    var volatilityAnn = clamp(stdev(returns) * Math.sqrt(252), 0.03, 0.80);

    return {
      structural: structuralAnn,
      trend: trendAnn,
      momentum: momentumAnn,
      holt: holtTrendAnn,
      volatility: volatilityAnn,
      observations: returns.length
    };
  }

  function modelComponents(signals, options) {
    var tilt = scenarioRate(options.scenario);
    if (options.model === 'damped') {
      return { structural: 0, trend: signals.holt, momentum: 0, scenario: tilt };
    }
    if (options.model === 'momentum') {
      return { structural: 0, trend: 0, momentum: signals.momentum, scenario: tilt };
    }
    return {
      structural: 0.45 * signals.structural,
      trend: 0.30 * signals.trend,
      momentum: 0.25 * signals.momentum,
      scenario: tilt
    };
  }

  function cumulativeLogReturn(day, components, model) {
    if (model === 'damped') {
      return components.trend * decaySum(day, 0.985) / 252 + components.scenario * day / 252;
    }
    if (model === 'momentum') {
      return components.momentum * decaySum(day, 0.996) / 252 + components.scenario * day / 252;
    }
    return components.structural * day / 252 +
      components.trend * decaySum(day, 0.997) / 252 +
      components.momentum * decaySum(day, 0.992) / 252 +
      components.scenario * day / 252;
  }

  function buildForecast(series, options) {
    var signals = calculateSignals(series, options.lookback);
    var components = modelComponents(signals, options);
    var last = series[series.length - 1];
    var dates = nextTradingDates(last.date, options.horizon);
    var dailyVol = signals.volatility / Math.sqrt(252);
    var z = zScore(options.confidence);
    var points = dates.map(function (date, index) {
      var day = index + 1;
      var logReturn = cumulativeLogReturn(day, components, options.model);
      var center = last.close * Math.exp(logReturn);
      var spread = z * dailyVol * Math.sqrt(day);
      return {
        date: date,
        median: center,
        lower: center * Math.exp(-spread),
        upper: center * Math.exp(spread),
        day: day
      };
    });
    var endpoint = points[points.length - 1];
    return {
      points: points,
      endpoint: endpoint,
      last: last,
      signals: signals,
      components: components,
      totalReturn: endpoint.median / last.close - 1,
      annualized: Math.exp(Math.log(endpoint.median / last.close) * 252 / options.horizon) - 1
    };
  }

  function runBacktest(series, options) {
    var horizon = options.horizon;
    var minimumHistory = Math.min(options.lookback, 1260);
    var firstOrigin = Math.max(minimumHistory + 5, series.length - 756 - horizon);
    var lastOrigin = series.length - horizon - 1;
    var step = Math.max(5, Math.round(horizon / 8));
    var outcomes = [];
    for (var origin = firstOrigin; origin <= lastOrigin; origin += step) {
      var training = series.slice(0, origin + 1);
      var testOptions = Object.assign({}, options, { scenario: 'base' });
      var testForecast = buildForecast(training, testOptions);
      var prediction = testForecast.endpoint;
      var actual = series[origin + horizon];
      var startingClose = series[origin].close;
      outcomes.push({
        originDate: series[origin].date,
        date: actual.date,
        actual: actual.close,
        predicted: prediction.median,
        lower: prediction.lower,
        upper: prediction.upper,
        error: Math.abs(prediction.median - actual.close) / actual.close,
        correctDirection: Math.sign(prediction.median - startingClose) === Math.sign(actual.close - startingClose),
        covered: actual.close >= prediction.lower && actual.close <= prediction.upper
      });
    }
    return {
      outcomes: outcomes,
      medianError: median(outcomes.map(function (item) { return item.error; })),
      directionRate: mean(outcomes.map(function (item) { return item.correctDirection ? 1 : 0; })),
      coverageRate: mean(outcomes.map(function (item) { return item.covered ? 1 : 0; }))
    };
  }

  function renderSummary() {
    var forecast = activeForecast;
    var first = data[0];
    var last = forecast.last;
    var endpoint = forecast.endpoint;
    $('#dataWindow').textContent = parseDate(first.date).getUTCFullYear() + ' — ' + parseDate(last.date).getUTCFullYear();
    $('#observationCount').textContent = number0.format(data.length) + ' daily observations';
    $('#heroHorizon').textContent = state.horizon + ' trading days';
    $('#forecastEndDate').textContent = 'Through ' + formatDate(endpoint.date);
    $('#lastClose').textContent = formatIndex(last.close);
    $('#lastCloseDate').textContent = 'Close on ' + formatDate(last.date);
    $('#forecastTarget').textContent = formatIndex(endpoint.median);
    $('#targetChange').textContent = formatPct(forecast.totalReturn, 1);
    $('#targetChange').classList.toggle('negative', forecast.totalReturn < 0);
    $('#targetDate').textContent = formatShortDate(endpoint.date);
    $('#expectedReturn').textContent = formatPct(forecast.totalReturn, 1);
    $('#annualizedReturn').textContent = formatPct(forecast.annualized, 1) + ' annualized model drift';
    $('#rangeLabel').textContent = state.confidence + '% MODEL RANGE';
    $('#forecastRange').textContent = formatIndex(endpoint.lower) + ' — ' + formatIndex(endpoint.upper);
    $('#rangeWidth').textContent = formatPct(endpoint.upper / endpoint.lower - 1, 0) + ' low-to-high width';
    $('#legendConfidence').textContent = state.confidence + '%';
    $('#volatilityReadout').textContent = number1.format(forecast.signals.volatility * 100) + '%';
    $('#volatilityWindow').textContent = 'Annualized from ' + forecast.signals.observations + ' returns';
  }

  function niceStep(range, count) {
    var rough = range / count;
    var power = Math.pow(10, Math.floor(Math.log10(rough)));
    var fraction = rough / power;
    var nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return nice * power;
  }

  function linePath(points, xAccessor, yAccessor) {
    return points.map(function (point, index) {
      return (index ? 'L' : 'M') + xAccessor(point, index).toFixed(2) + ',' + yAccessor(point, index).toFixed(2);
    }).join(' ');
  }

  function renderMainChart() {
    var svg = $('#priceChart');
    var historyCount = state.chartRange === 'all' ? data.length : Math.min(Number(state.chartRange), data.length);
    var history = data.slice(data.length - historyCount);
    var forecastPoints = activeForecast.points;
    var width = 920;
    var height = 455;
    var margin = { top: 23, right: 25, bottom: 43, left: 62 };
    var innerWidth = width - margin.left - margin.right;
    var innerHeight = height - margin.top - margin.bottom;
    var totalCount = history.length + forecastPoints.length;
    function xAt(index) { return margin.left + (index / Math.max(1, totalCount - 1)) * innerWidth; }
    var yValues = history.map(function (point) { return point.close; });
    forecastPoints.forEach(function (point) { yValues.push(point.lower, point.upper); });
    var rawMin = Math.min.apply(null, yValues);
    var rawMax = Math.max.apply(null, yValues);
    var padding = (rawMax - rawMin) * 0.055 || rawMax * 0.05;
    var step = niceStep(rawMax - rawMin + padding * 2, 5);
    var yMin = Math.floor((rawMin - padding) / step) * step;
    var yMax = Math.ceil((rawMax + padding) / step) * step;
    function yAt(value) { return margin.top + (yMax - value) / (yMax - yMin) * innerHeight; }

    var historyPath = linePath(history, function (_, index) { return xAt(index); }, function (point) { return yAt(point.close); });
    var forecastLinePoints = [{ date: history[history.length - 1].date, median: history[history.length - 1].close }].concat(forecastPoints);
    var forecastPath = linePath(forecastLinePoints, function (_, index) { return xAt(history.length - 1 + index); }, function (point) { return yAt(point.median); });
    var upperPath = forecastPoints.map(function (point, index) { return xAt(history.length + index).toFixed(2) + ',' + yAt(point.upper).toFixed(2); });
    var lowerPath = forecastPoints.slice().reverse().map(function (point, reverseIndex) {
      var originalIndex = forecastPoints.length - 1 - reverseIndex;
      return xAt(history.length + originalIndex).toFixed(2) + ',' + yAt(point.lower).toFixed(2);
    });
    var bandPath = 'M' + upperPath.join(' L') + ' L' + lowerPath.join(' L') + ' Z';
    var historyArea = historyPath + ' L' + xAt(history.length - 1).toFixed(2) + ',' + (margin.top + innerHeight) + ' L' + xAt(0).toFixed(2) + ',' + (margin.top + innerHeight) + ' Z';
    var forecastStartX = xAt(history.length - 1);

    var grid = '';
    for (var tick = yMin; tick <= yMax + step / 2; tick += step) {
      var y = yAt(tick);
      grid += '<line x1="' + margin.left + '" y1="' + y + '" x2="' + (width - margin.right) + '" y2="' + y + '" stroke="#e6ebe8" stroke-width="1"/>';
      grid += '<text x="' + (margin.left - 11) + '" y="' + (y + 3) + '" text-anchor="end">' + formatIndex(tick) + '</text>';
    }

    var labelIndexes = [0, Math.round((totalCount - 1) * .25), Math.round((totalCount - 1) * .5), Math.round((totalCount - 1) * .75), totalCount - 1];
    var xLabels = '';
    var seen = {};
    labelIndexes.forEach(function (index) {
      if (seen[index]) return;
      seen[index] = true;
      var date = index < history.length ? history[index].date : forecastPoints[index - history.length].date;
      xLabels += '<text x="' + xAt(index) + '" y="' + (height - 15) + '" text-anchor="middle">' + monthYear.format(parseDate(date)) + '</text>';
    });

    svg.innerHTML =
      '<defs>' +
        '<linearGradient id="historyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b7658" stop-opacity=".12"/><stop offset="1" stop-color="#0b7658" stop-opacity="0"/></linearGradient>' +
        '<linearGradient id="forecastBand" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#20b884" stop-opacity=".08"/><stop offset="1" stop-color="#20b884" stop-opacity=".22"/></linearGradient>' +
        '<clipPath id="plotClip"><rect x="' + margin.left + '" y="' + margin.top + '" width="' + innerWidth + '" height="' + innerHeight + '"/></clipPath>' +
      '</defs>' +
      '<rect x="' + forecastStartX + '" y="' + margin.top + '" width="' + (width - margin.right - forecastStartX) + '" height="' + innerHeight + '" fill="#f2f9f5"/>' +
      grid + xLabels +
      '<g clip-path="url(#plotClip)">' +
        '<path d="' + historyArea + '" fill="url(#historyFill)"/>' +
        '<path d="' + bandPath + '" fill="url(#forecastBand)" stroke="#20b884" stroke-opacity=".16"/>' +
        '<path d="' + historyPath + '" fill="none" stroke="#17342c" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="' + forecastPath + '" fill="none" stroke="#14a978" stroke-width="2.4" stroke-dasharray="6 5" stroke-linecap="round"/>' +
      '</g>' +
      '<line x1="' + forecastStartX + '" y1="' + margin.top + '" x2="' + forecastStartX + '" y2="' + (margin.top + innerHeight) + '" stroke="#93aaa1" stroke-width="1" stroke-dasharray="3 4"/>' +
      '<rect x="' + (forecastStartX + 7) + '" y="' + (margin.top + 6) + '" width="58" height="19" rx="5" fill="#e1f3eb"/>' +
      '<text x="' + (forecastStartX + 36) + '" y="' + (margin.top + 19) + '" text-anchor="middle" fill="#0b7658" font-size="8" font-weight="800" letter-spacing="1">FORECAST</text>' +
      '<circle cx="' + forecastStartX + '" cy="' + yAt(history[history.length - 1].close) + '" r="4" fill="#fff" stroke="#17342c" stroke-width="2"/>' +
      '<circle cx="' + xAt(totalCount - 1) + '" cy="' + yAt(forecastPoints[forecastPoints.length - 1].median) + '" r="4.5" fill="#b9ef69" stroke="#0b7658" stroke-width="2"/>' +
      '<g id="hoverLayer" style="display:none"><line id="hoverLine" y1="' + margin.top + '" y2="' + (margin.top + innerHeight) + '" stroke="#71857e" stroke-width="1" stroke-dasharray="3 3"/><circle id="hoverDot" r="4" fill="#fff" stroke="#0b7658" stroke-width="2"/></g>';

    chartHitPoints = history.map(function (point, index) {
      return { x: xAt(index), y: yAt(point.close), date: point.date, value: point.close, type: 'Historical close' };
    }).concat(forecastPoints.map(function (point, index) {
      return { x: xAt(history.length + index), y: yAt(point.median), date: point.date, value: point.median, lower: point.lower, upper: point.upper, type: 'Median forecast' };
    }));
  }

  function renderBacktest() {
    var backtest = activeBacktest;
    var outcomes = backtest.outcomes;
    $('#mapeMetric').textContent = number1.format(backtest.medianError * 100) + '%';
    $('#directionMetric').textContent = number0.format(backtest.directionRate * 100) + '%';
    $('#coverageMetric').textContent = number0.format(backtest.coverageRate * 100) + '%';
    $('#coverageLabel').textContent = 'inside ' + state.confidence + '% range';
    $('#caseMetric').textContent = number0.format(outcomes.length);
    $('#backtestWindow').textContent = state.horizon + '-day rolling origins';

    var svg = $('#validationChart');
    if (!outcomes.length) {
      svg.innerHTML = '<text x="310" y="120" text-anchor="middle">Not enough data for this validation window.</text>';
      return;
    }
    var width = 620;
    var height = 245;
    var margin = { top: 31, right: 18, bottom: 35, left: 51 };
    var innerWidth = width - margin.left - margin.right;
    var innerHeight = height - margin.top - margin.bottom;
    var values = [];
    outcomes.forEach(function (item) { values.push(item.actual, item.predicted, item.lower, item.upper); });
    var rawMin = Math.min.apply(null, values);
    var rawMax = Math.max.apply(null, values);
    var pad = (rawMax - rawMin) * .08 || rawMax * .04;
    var yMin = rawMin - pad;
    var yMax = rawMax + pad;
    function xAt(index) { return margin.left + index / Math.max(1, outcomes.length - 1) * innerWidth; }
    function yAt(value) { return margin.top + (yMax - value) / (yMax - yMin) * innerHeight; }
    var actualPath = linePath(outcomes, function (_, index) { return xAt(index); }, function (point) { return yAt(point.actual); });
    var predictedPath = linePath(outcomes, function (_, index) { return xAt(index); }, function (point) { return yAt(point.predicted); });
    var upper = outcomes.map(function (point, index) { return xAt(index).toFixed(2) + ',' + yAt(point.upper).toFixed(2); });
    var lower = outcomes.slice().reverse().map(function (point, reverseIndex) {
      var index = outcomes.length - 1 - reverseIndex;
      return xAt(index).toFixed(2) + ',' + yAt(point.lower).toFixed(2);
    });
    var band = 'M' + upper.join(' L') + ' L' + lower.join(' L') + ' Z';
    var grid = '';
    for (var g = 0; g <= 3; g += 1) {
      var value = yMin + (yMax - yMin) * g / 3;
      var y = yAt(value);
      grid += '<line x1="' + margin.left + '" y1="' + y + '" x2="' + (width - margin.right) + '" y2="' + y + '" stroke="#e8ecea"/>';
      grid += '<text x="' + (margin.left - 8) + '" y="' + (y + 3) + '" text-anchor="end">' + formatIndex(value) + '</text>';
    }
    var firstDate = outcomes[0].date;
    var middleDate = outcomes[Math.floor(outcomes.length / 2)].date;
    var lastDate = outcomes[outcomes.length - 1].date;
    svg.innerHTML =
      '<defs><linearGradient id="testBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#20b884" stop-opacity=".17"/><stop offset="1" stop-color="#20b884" stop-opacity=".04"/></linearGradient><clipPath id="testClip"><rect x="' + margin.left + '" y="' + margin.top + '" width="' + innerWidth + '" height="' + innerHeight + '"/></clipPath></defs>' +
      grid +
      '<text x="' + margin.left + '" y="' + (height - 11) + '" text-anchor="start">' + monthYear.format(parseDate(firstDate)) + '</text>' +
      '<text x="' + (margin.left + innerWidth / 2) + '" y="' + (height - 11) + '" text-anchor="middle">' + monthYear.format(parseDate(middleDate)) + '</text>' +
      '<text x="' + (width - margin.right) + '" y="' + (height - 11) + '" text-anchor="end">' + monthYear.format(parseDate(lastDate)) + '</text>' +
      '<g clip-path="url(#testClip)"><path d="' + band + '" fill="url(#testBand)"/><path d="' + predictedPath + '" fill="none" stroke="#20a878" stroke-width="2" stroke-dasharray="5 4"/><path d="' + actualPath + '" fill="none" stroke="#17342c" stroke-width="2"/></g>' +
      '<g transform="translate(' + (margin.left + 4) + ',13)"><line x1="0" y1="0" x2="17" y2="0" stroke="#17342c" stroke-width="2"/><text x="23" y="3">Actual</text><line x1="75" y1="0" x2="92" y2="0" stroke="#20a878" stroke-width="2" stroke-dasharray="4 3"/><text x="98" y="3">Forecast</text></g>';
  }

  function renderDrivers() {
    var components = activeForecast.components;
    ['structural', 'trend', 'momentum', 'scenario'].forEach(function (name) {
      var row = $('[data-driver="' + name + '"]');
      var value = components[name];
      $('strong', row).textContent = formatPct(value, 1);
      var bar = $('.driver-track i', row);
      var width = Math.min(50, Math.abs(value) / .25 * 50);
      bar.style.width = width + '%';
      bar.classList.toggle('negative', value < 0);
      bar.style.left = value < 0 ? '50%' : '50%';
    });
    var summaries = {
      ensemble: 'The blended model shrinks noisy short-term signals toward the longer-run average. Trend and momentum effects fade as the horizon grows.',
      damped: 'The damped model extends the exponentially smoothed local trend, then reduces its influence each day. It can flatten quickly after a sharp move.',
      momentum: 'The momentum model uses capped 1, 3 and 12-month returns. It is intentionally reactive and usually the least stable of these baselines.'
    };
    $('#modelSummary').textContent = summaries[state.model];
  }

  function syncControls() {
    $$('#modelControls [data-model]').forEach(function (button) { button.classList.toggle('active', button.dataset.model === state.model); });
    $$('#confidenceControls [data-confidence]').forEach(function (button) { button.classList.toggle('active', Number(button.dataset.confidence) === state.confidence); });
    $$('#lookbackControls [data-lookback]').forEach(function (button) { button.classList.toggle('active', Number(button.dataset.lookback) === state.lookback); });
    $$('#scenarioControls [data-scenario]').forEach(function (button) { button.classList.toggle('active', button.dataset.scenario === state.scenario); });
    $$('#rangeControls [data-range]').forEach(function (button) { button.classList.toggle('active', String(button.dataset.range) === String(state.chartRange)); });
    $$('#horizonQuick [data-horizon]').forEach(function (button) { button.classList.toggle('active', Number(button.dataset.horizon) === state.horizon); });
    var slider = $('#horizonSlider');
    slider.value = state.horizon;
    slider.style.setProperty('--fill', ((state.horizon - 20) / (252 - 20) * 100).toFixed(1) + '%');
    $('#horizonOutput').textContent = state.horizon + ' days';
    $('#scenarioNote').textContent = state.scenario === 'base' ? 'No drift adjustment' : (state.scenario === 'bull' ? '+8% annual drift' : '−8% annual drift');
  }

  function renderSource() {
    var sourceLink = $('#sourceLink');
    if (dataMeta.custom) {
      sourceLink.textContent = dataMeta.source;
      sourceLink.removeAttribute('href');
      $('.market-status').innerHTML = '<i></i> CUSTOM CSV';
    } else {
      sourceLink.textContent = 'Federal Reserve Bank of St. Louis (FRED) ↗';
      sourceLink.href = dataMeta.sourceUrl || 'https://fred.stlouisfed.org/series/SP500';
      $('.market-status').innerHTML = '<i></i> BUNDLED DATA';
    }
  }

  function updateDashboard() {
    if (data.length < 300) return;
    activeForecast = buildForecast(data, state);
    activeBacktest = runBacktest(data, state);
    syncControls();
    renderSummary();
    renderMainChart();
    renderBacktest();
    renderDrivers();
    renderSource();
  }

  function showToast(message, isError) {
    var toast = $('#toast');
    $('span', toast).textContent = message;
    $('i', toast).style.background = isError ? '#f08a80' : '#b9ef69';
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  function parseCsvLine(line) {
    var fields = [];
    var current = '';
    var quoted = false;
    for (var i = 0; i < line.length; i += 1) {
      var character = line[i];
      if (character === '"') {
        if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
        else quoted = !quoted;
      } else if (character === ',' && !quoted) {
        fields.push(current.trim()); current = '';
      } else current += character;
    }
    fields.push(current.trim());
    return fields;
  }

  function importCsv(text, fileName) {
    var lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(function (line) { return line.trim(); });
    if (lines.length < 2) throw new Error('The CSV is empty.');
    var headers = parseCsvLine(lines[0]).map(function (header) { return header.toLowerCase().replace(/[_-]+/g, ' ').trim(); });
    var dateNames = ['date', 'observation date', 'timestamp'];
    var closeNames = ['close', 'adj close', 'adjusted close', 'sp500', 'value'];
    var dateIndex = headers.findIndex(function (header) { return dateNames.indexOf(header) >= 0; });
    var closeIndex = headers.findIndex(function (header) { return closeNames.indexOf(header) >= 0; });
    if (dateIndex < 0 || closeIndex < 0) throw new Error('Could not find Date and Close columns.');
    var rows = lines.slice(1).map(parseCsvLine).map(function (fields) {
      var rawDate = fields[dateIndex] || '';
      var parsed = new Date(rawDate);
      var isoDate = /^\d{4}-\d{2}-\d{2}/.test(rawDate) ? rawDate.slice(0, 10) : (isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10));
      var close = Number(String(fields[closeIndex] || '').replace(/[$,\s]/g, ''));
      return [isoDate, close];
    });
    var imported = normalizeData(rows);
    if (imported.length < 300) throw new Error('At least 300 valid daily observations are required.');
    data = imported;
    dataMeta = { source: fileName + ' (local upload)', custom: true };
    updateDashboard();
  }

  function exportForecast() {
    var rows = ['date,type,median,lower,upper,confidence,model'];
    activeForecast.points.forEach(function (point) {
      rows.push([
        point.date,
        'forecast',
        point.median.toFixed(2),
        point.lower.toFixed(2),
        point.upper.toFixed(2),
        state.confidence,
        state.model
      ].join(','));
    });
    var blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'sp500-forecast-' + activeForecast.last.date + '-' + state.horizon + 'd.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    showToast('Forecast CSV exported');
  }

  function bindControls() {
    $$('#modelControls [data-model]').forEach(function (button) {
      button.addEventListener('click', function () { state.model = button.dataset.model; updateDashboard(); showToast('Model changed to ' + $('strong', button).textContent); });
    });
    $('#horizonSlider').addEventListener('input', function (event) { state.horizon = Number(event.target.value); updateDashboard(); });
    $('#horizonSlider').addEventListener('change', function () { showToast('Forecast horizon updated'); });
    $$('#horizonQuick [data-horizon]').forEach(function (button) {
      button.addEventListener('click', function () { state.horizon = Number(button.dataset.horizon); updateDashboard(); });
    });
    $$('#confidenceControls [data-confidence]').forEach(function (button) {
      button.addEventListener('click', function () { state.confidence = Number(button.dataset.confidence); updateDashboard(); });
    });
    $$('#lookbackControls [data-lookback]').forEach(function (button) {
      button.addEventListener('click', function () { state.lookback = Number(button.dataset.lookback); updateDashboard(); });
    });
    $$('#scenarioControls [data-scenario]').forEach(function (button) {
      button.addEventListener('click', function () { state.scenario = button.dataset.scenario; updateDashboard(); });
    });
    $$('#rangeControls [data-range]').forEach(function (button) {
      button.addEventListener('click', function () { state.chartRange = button.dataset.range === 'all' ? 'all' : Number(button.dataset.range); syncControls(); renderMainChart(); });
    });
    $('#resetButton').addEventListener('click', function () { state = Object.assign({}, DEFAULTS); updateDashboard(); showToast('Assumptions reset'); });
    $('#exportButton').addEventListener('click', exportForecast);

    var dialog = $('#csvDialog');
    $('#openCsvHelp').addEventListener('click', function () { if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', ''); });
    $('#csvInput').addEventListener('change', function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;
      file.text().then(function (text) {
        try {
          importCsv(text, file.name);
          if (dialog.open) dialog.close();
          showToast(number0.format(data.length) + ' observations imported');
        } catch (error) { showToast(error.message, true); }
        event.target.value = '';
      });
    });
    $('#restoreData').addEventListener('click', function () {
      data = bundledData.slice();
      dataMeta = Object.assign({}, window.SP500_DATA_META || {});
      updateDashboard();
      if (dialog.open) dialog.close();
      showToast('Bundled S&P 500 data restored');
    });

    var svg = $('#priceChart');
    svg.addEventListener('pointermove', function (event) {
      if (!chartHitPoints.length) return;
      var rect = svg.getBoundingClientRect();
      var svgX = (event.clientX - rect.left) / rect.width * 920;
      var nearest = chartHitPoints.reduce(function (best, point) { return Math.abs(point.x - svgX) < Math.abs(best.x - svgX) ? point : best; });
      var tooltip = $('#chartTooltip');
      $('#tooltipDate').textContent = formatDate(nearest.date);
      $('#tooltipValue').textContent = formatIndex(nearest.value);
      $('#tooltipDetail').textContent = nearest.type === 'Median forecast' ? state.confidence + '% range ' + formatIndex(nearest.lower) + ' — ' + formatIndex(nearest.upper) : nearest.type;
      var left = clamp(svg.offsetLeft + nearest.x / 920 * rect.width, 80, $('#mainChartWrap').clientWidth - 80);
      var top = svg.offsetTop + nearest.y / 455 * rect.height - 8;
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
      tooltip.classList.add('visible');
      tooltip.setAttribute('aria-hidden', 'false');
      var layer = $('#hoverLayer');
      var line = $('#hoverLine');
      var dot = $('#hoverDot');
      if (layer && line && dot) {
        layer.style.display = '';
        line.setAttribute('x1', nearest.x); line.setAttribute('x2', nearest.x);
        dot.setAttribute('cx', nearest.x); dot.setAttribute('cy', nearest.y);
      }
    });
    svg.addEventListener('pointerleave', function () {
      $('#chartTooltip').classList.remove('visible');
      $('#chartTooltip').setAttribute('aria-hidden', 'true');
      var layer = $('#hoverLayer');
      if (layer) layer.style.display = 'none';
    });
  }

  function init() {
    if (data.length < 300) {
      document.body.innerHTML = '<main style="padding:40px;font-family:sans-serif"><h1>Data could not be loaded</h1><p>The bundled S&P 500 history is missing or incomplete.</p></main>';
      return;
    }
    bindControls();
    updateDashboard();
  }

  // A small, read-only surface for automated model checks and classroom reuse.
  window.NorthstarModel = Object.freeze({
    normalizeData: normalizeData,
    calculateSignals: calculateSignals,
    buildForecast: buildForecast,
    runBacktest: runBacktest,
    nextTradingDates: nextTradingDates
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
