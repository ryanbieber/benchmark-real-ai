Built and validated the working dashboard.

Local URL: http://127.0.0.1:4173/index.html

Files:
- [index.html](/home/carnufex/Documents/Codex/bench-temp/benchmark-real-ai-gpt-5.5-high-uk9WdE/index.html)
- [sp500-data.json](/home/carnufex/Documents/Codex/bench-temp/benchmark-real-ai-gpt-5.5-high-uk9WdE/sp500-data.json)
- [fetch-data.mjs](/home/carnufex/Documents/Codex/bench-temp/benchmark-real-ai-gpt-5.5-high-uk9WdE/fetch-data.mjs)
- [validate-dashboard.mjs](/home/carnufex/Documents/Codex/bench-temp/benchmark-real-ai-gpt-5.5-high-uk9WdE/validate-dashboard.mjs)

What it includes:
- Interactive model selector: drift, momentum-adjusted, mean reversion
- Horizon, lookback, confidence band, shock, and volatility controls
- Main price/forecast chart, terminal distribution, drawdown chart, forecast table
- CSV export
- Embedded S&P 500 data through `2026-08-13`, fetched from Yahoo’s chart endpoint. Yahoo’s historical page is here: https://finance.yahoo.com/quote/%5EGSPC/history/

Validation passed with `node validate-dashboard.mjs`: charts rendered nonblank, metrics populated, forecast rows rendered, and scripted control changes worked. A validation screenshot was saved as [dashboard-validation.png](/home/carnufex/Documents/Codex/bench-temp/benchmark-real-ai-gpt-5.5-high-uk9WdE/dashboard-validation.png).

This is a statistical scenario tool, not investment advice.