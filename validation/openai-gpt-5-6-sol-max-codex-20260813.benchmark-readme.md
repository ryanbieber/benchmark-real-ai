# Northstar — S&P 500 Forecast Lab

A self-contained, interactive HTML dashboard for exploring a transparent S&P 500 baseline forecast. It uses an embedded FRED daily-close snapshot, so there is no API key, package install, or build step.

## Run it

Open `index.html` directly in a modern browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## What is included

- 1-, 3-, 6-, and 12-month forecast horizons
- Drift, log-linear trend, and damped-trend engines
- Adjustable training window, annual drift, volatility regime, and confidence interval
- Interactive historical/forecast chart with hover values
- Bear/base/bull outcome markers
- Rolling-origin historical backtest with error, direction, coverage, and bias metrics
- Forecast CSV export
- Responsive desktop and mobile layouts

The model is an educational, probabilistic baseline—not investment advice or a trading signal. Its assumptions and limitations are documented inside the dashboard.
