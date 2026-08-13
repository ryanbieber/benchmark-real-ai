# Northstar S&P 500 Scenario Lab

A dependency-free interactive HTML dashboard for exploring possible S&P 500 price-index paths. It ships with FRED month-end data through August 12, 2026 and supports custom CSV imports.

## Run

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## CSV format

Use ISO dates and positive closing values. Daily observations are automatically reduced to the last valid close in each month.

```csv
date,close
2024-01-31,4845.65
2024-02-29,5096.27
```

The model resamples centered historical monthly log returns, adds the chosen drift adjustment, and summarizes the resulting paths. This is an educational scenario tool—not investment advice.
