# Benchmark Run Record

- Run ID: `openai-gpt-5-5-medium-codex-20260812`
- Model: `openai / gpt-5.5`
- Reasoning: native `medium`, normalized `medium`
- Harness: `Codex CLI 0.144.4`, interface `exec`
- Workspace: fresh temp workspace at `/home/carnufex/Documents/Codex/bench-temp/benchmark-real-ai-gpt-5.5-medium-5z8yiB`
- Isolated Codex home: `/home/carnufex/Documents/Codex/bench-temp/codex-bench-home-gpt-5.5-medium-lKJVIg` with copied `auth.json` only
- Data source: `historical-snapshot`
- Status: dashboard created, browser-validated, no import rendering repair required

## Final Visible Response

~~~md
Built and validated the dashboard.

Open it here while the local server is running: `http://127.0.0.1:8000/index.html`

Files:
- [index.html](/home/carnufex/Documents/Codex/bench-temp/benchmark-real-ai-gpt-5.5-medium-5z8yiB/index.html)
- [dashboard.png](/home/carnufex/Documents/Codex/bench-temp/benchmark-real-ai-gpt-5.5-medium-5z8yiB/dashboard.png)
- [dashboard-mobile.png](/home/carnufex/Documents/Codex/bench-temp/benchmark-real-ai-gpt-5.5-medium-5z8yiB/dashboard-mobile.png)

What’s included:
- Interactive S&P 500 forecast dashboard in standalone HTML/CSS/JS
- Model selector: drift + volatility, linear trend, moving average
- Controls for lookback, forecast horizon, and confidence band
- Canvas chart, metrics, diagnostics, forecast table, CSV export
- Embedded FRED snapshot ending `2026-08-11` with last close `7,728.20`
- Live FRED CSV refresh path, with embedded fallback when browser CORS blocks it

Validation completed:
- Local server returns `200 OK`
- Headless Chrome desktop screenshot rendered
- Emulated 390px mobile viewport rendered with no horizontal overflow
- Browser interaction test changed model/settings and recalculated finite values
- Checked rendered DOM for `NaN`/`undefined`: none found

Data source: FRED S&P 500 daily series `SP500` from the St. Louis Fed: https://fred.stlouisfed.org/series/SP500
~~~

## Tool / Command Summary

1. Started `codex exec` in an empty temp workspace outside the repository with `gpt-5.5` and `model_reasoning_effort="medium"`.
2. Confirmed local validation tooling, including Node, npm, and `/usr/bin/google-chrome`.
3. Wrote a standalone `index.html` dashboard with forecast controls, Canvas charting, metrics, diagnostics, forecast table, and CSV export.
4. Served the dashboard with `python3 -m http.server 8000` and rendered it in headless Chrome.
5. Found direct browser access to Stooq/Yahoo/FRED live data paths was blocked or unreliable, fetched FRED SP500 data by command line, and embedded a 1,500-row FRED snapshot ending `2026-08-11`.
6. Validation caught blank FRED holiday rows producing `NaN`; the benchmark run updated its parser to accept only positive numeric closes and revalidated.
7. Ran desktop screenshot, DOM checks, Chrome DevTools interaction checks, full-canvas nonblank checks, and emulated 390px mobile validation with no horizontal overflow.

## Imported Artifact Notes

- Imported original dashboard: `runs/original/openai-gpt-5-5-medium-codex-20260812.html`
- Imported displayed dashboard: `runs/rendered/openai-gpt-5-5-medium-codex-20260812.html`
- The displayed HTML is byte-identical to the original HTML.
- No post-run rendering repair was required.
- Raw Codex event stream: `validation/openai-gpt-5-5-medium-codex-20260812.session.jsonl`
- Screenshots: `validation/openai-gpt-5-5-medium-codex-20260812-dashboard.png`, `validation/openai-gpt-5-5-medium-codex-20260812-dashboard-mobile.png`
