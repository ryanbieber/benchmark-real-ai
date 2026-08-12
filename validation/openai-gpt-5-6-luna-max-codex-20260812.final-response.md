Done — the validated dashboard is here:

- [index.html](/tmp/benchmark-real-ai-gpt-5.6-luna-max-Qeiamt/index.html)
- [sp500-data.js](/tmp/benchmark-real-ai-gpt-5.6-luna-max-Qeiamt/sp500-data.js)

Run it with:

```bash
python -m http.server 8765
```

Then open `http://localhost:8765`.

It includes interactive lookback, forecast horizon, confidence band, hover tooltips, rolling holdout validation, and CSV upload support. The embedded snapshot uses daily S&P 500 closes from [FRED’s SP500 series](https://fred.stlouisfed.org/series/SP500).