# Benchmark Run Record

- Run ID: `openai-gpt-5-6-luna-medium-codex-20260812`
- Model: `openai / gpt-5.6-luna`
- Reasoning: native `medium`, normalized `medium`
- Harness: `Codex CLI 0.144.4`, interface `exec`
- Workspace: fresh temporary workspace at `/tmp/benchmark-real-ai-gpt-5.6-luna-medium-2JBu1e`
- Data source: `synthetic` (`Demo market history`)
- Status: dashboard created and validated; no import rendering repair required

## Final visible response

Built and validated the interactive dashboard:

[Open `index.html`](/tmp/benchmark-real-ai-gpt-5.6-luna-medium-2JBu1e/index.html)

Features include:

- S&P 500 historical/demo chart with forecast interval
- 1Y / 3Y / 5Y views
- Forecast horizon, regime, and volatility controls
- Base, bull, and bear scenarios
- Checkpoint forecast table
- Interactive chart tooltips
- CSV history import (`date,close`)
- Forecast CSV export
- Responsive layout

Validation completed:

- JavaScript syntax check passed
- Chrome headless render passed
- Forecast values and controls populated in the rendered DOM
- No browser errors detected

The default dataset is clearly labeled demo history; import licensed/current S&P 500 data for production forecasting.

## Tool and command summary

1. Started `codex exec` once in the empty temporary workspace with the exact benchmark prompt, `gpt-5.6-luna`, medium reasoning, shell/file-editing/web-search/browser-validation capabilities, `danger-full-access`, and approval policy `never`.
2. Created a self-contained `index.html` with demo data, forecast interval, horizon/regime/volatility controls, chart range controls, CSV import/export, and responsive layout.
3. Ran JavaScript syntax validation and headless Chrome rendering; the final response reported populated forecast values, populated controls, and no browser errors.
4. Imported the HTML without changing bytes into the original and displayed artifact paths, served the displayed artifact over HTTP, and confirmed a 200 response and rendered dashboard markers.

## Import notes

- Original: `runs/original/openai-gpt-5-6-luna-medium-codex-20260812.html`
- Displayed: `runs/rendered/openai-gpt-5-6-luna-medium-codex-20260812.html`
- The original and displayed files are byte-identical.
- No rendering repair was necessary; `repairLog` is `null`.
- Raw Codex event stream: `validation/openai-gpt-5-6-luna-medium-codex-20260812.session.jsonl`
