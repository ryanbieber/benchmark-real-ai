# Northstar — S&P 500 Forecast Lab

A dependency-free interactive dashboard for exploring a transparent S&P 500 baseline forecast. It includes bundled daily FRED data, three model choices, forecast intervals, scenario tilts, walk-forward validation, CSV import, and forecast export.

## Run it

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:8765`.

## Forecast recipe

1. Convert closing prices to daily log returns.
2. Estimate long-run drift, a regularized local trend, and multi-period momentum.
3. Combine or select those signals and compound them over the chosen horizon.
4. Build a lognormal model interval from observed annualized volatility.
5. Re-run the same forecast from rolling historical origins to show out-of-sample error, direction hit rate, and interval coverage.

The dashboard is educational and intentionally exposes its assumptions. It is not investment advice, and its intervals do not cover every source of market risk.

## Files

- `index.html` — semantic dashboard markup
- `styles.css` — responsive visual system
- `app.js` — forecasting, charting, backtesting, import, and export logic
- `data.js` — bundled FRED SP500 daily closes through 2026-08-12
