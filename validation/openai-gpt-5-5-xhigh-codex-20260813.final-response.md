Built and validated the dashboard.

Files:
- [index.html](/tmp/benchmark-real-ai-gpt-5-5-xhigh-c2hH3S/workspace/index.html)
- [server.mjs](/tmp/benchmark-real-ai-gpt-5-5-xhigh-c2hH3S/workspace/server.mjs)
- [desktop screenshot](/tmp/benchmark-real-ai-gpt-5-5-xhigh-c2hH3S/workspace/dashboard-desktop.png)
- [mobile screenshot](/tmp/benchmark-real-ai-gpt-5-5-xhigh-c2hH3S/workspace/dashboard-mobile.png)

It is running here:

```bash
http://127.0.0.1:4173/
```

Validated with Playwright against the running dashboard:
- Live FRED S&P 500 data loaded through `Aug 12, 2026`
- Latest close shown: `7,748.50`
- Chart canvas rendered with nonblank pixels
- Model controls update the forecast
- Scenario table renders 5 rows
- Mobile layout has no horizontal page overflow

The data source is FRED’s `SP500` series from S&P Dow Jones Indices LLC: https://fred.stlouisfed.org/series/SP500. The forecast is an educational statistical baseline, not investment advice.