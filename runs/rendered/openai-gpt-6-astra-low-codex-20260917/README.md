# Index Lab

Open `index.html` directly in a modern browser. It is a standalone HTML dashboard with embedded data, styles, charts, and calculations; no installation or server is needed.

Choose a model, training window, horizon, and prediction interval. Use the Backtest tab to inspect historical predictions. Import a CSV with `Date,Close` or `observation_date,SP500` columns to update the data. The CSV button exports the active forecast or backtest.

Bundled source: S&P Dow Jones Indices LLC, S&P 500 [SP500], retrieved from FRED, https://fred.stlouisfed.org/series/SP500. Snapshot retrieved September 16, 2026; 2,512 valid closing observations from September 19, 2016 through September 16, 2026. This is a price index and excludes dividends. Source attribution and methodology references are also in the dashboard.

## Validation

`node build.js` rebuilds the standalone HTML from the template, JavaScript, and CSV.

`node validate.js` runs numerical assertions and Chromium browser checks. The browser test currently references the Playwright and Chromium installations available on this workstation; adjust those paths on another machine.

Passed checks: constant-price forecast, custom annual compounding, interval ordering, initial value, future-data isolation, baseline equivalence, invalid CSV rejection, insufficient backtest history, interactive controls, chart hover, CSV export, import/error recovery, snapshot restore, mobile horizontal overflow, and absence of JavaScript errors. Screenshots are saved as `dashboard-desktop.png` and `dashboard-mobile.png`.

Default results: 78 rolling origins, 126-session horizon, 756-session training window, historical log growth, 90% interval. Model MAPE 9.0756%; no-change MAPE 10.0317%; observed interval coverage 94.8718%. Backtest outcomes overlap and are not independent. This validates implementation and reports retrospective performance; it does not establish reliable future predictive power.
