# Northstar S&P 500 Scenario Lab

A standalone, interactive HTML dashboard for exploring a transparent statistical baseline for the S&P 500. It embeds a dated FRED snapshot and performs all calculations locally in the browser.

## Run it

Open `index.html` directly in a modern browser, or serve the folder locally:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## How to use the dashboard

1. Choose a **drift model**. Historical drift uses the average daily log return; log-price trend fits a straight line to log index levels; zero drift is a stress case.
2. Choose an **estimation lookback**. Shorter windows react faster but are noisier; longer windows smooth across more market regimes.
3. Set the **forecast horizon** from 21 to 252 trading sessions.
4. Widen or narrow the **confidence range**, apply a clearly labeled drift tilt, or stress volatility.
5. Read the endpoint as a **distribution**, not a target. The central line is the model median; the shaded area is the selected model-implied interval.
6. Check **walk-forward validation**. It rebuilds the model at historical start dates using only information available then and reports endpoint error, direction hit rate, and interval coverage.

## Model

The baseline assumes log returns are normally distributed:

```text
log(Sₜ / S₀) ~ Normal(μt, σ²t)
```

The dashboard estimates annualized drift `μ` and annualized realized volatility `σ` from the selected history. This is intentionally simple and explainable. It does not model valuations, dividends, macroeconomic variables, regime changes, jumps, or volatility clustering.

## Data and limitations

- Snapshot: FRED series `SP500`, sourced from S&P Dow Jones Indices LLC, through the date shown in the dashboard.
- The series is a daily closing **price index** and excludes dividends.
- The forecast is educational and is not investment advice or a trading signal.
- Historical validation describes this model on this sample; it does not establish future accuracy.

Primary references: [FRED SP500](https://fred.stlouisfed.org/series/SP500) and [S&P 500 index overview](https://www.spglobal.com/spdji/en/indices/equity/sp-500/).
