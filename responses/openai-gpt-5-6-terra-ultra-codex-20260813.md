# Benchmark Run Record

- Run ID: `openai-gpt-5-6-terra-ultra-codex-20260813`
- Model: `openai / gpt-5.6-terra`
- Reasoning: native `ultra`, normalized `ultra`
- Harness: `Codex CLI 0.144.4`, interface `exec`
- Workspace: fresh temporary workspace at `/tmp/benchmark-real-ai-gpt-5-6-terra-ultra-BzdnpU`
- Data source: `synthetic` (the shipped default is a deterministic illustrative series; the dashboard supports user-supplied daily-close CSV imports)
- Status: dashboard created and browser-validated; no import rendering repair required
- Timing: `2026-08-13T11:33:19.948Z` to `2026-08-13T11:47:00.974Z` (`821.026` seconds)

## Final Visible Response (verbatim)

Built and validated the standalone dashboard: [index.html](/tmp/benchmark-real-ai-gpt-5-6-terra-ultra-BzdnpU/index.html).

It includes interactive horizon/model/confidence/scenario controls, SVG forecast fan, tooltips, CSV import (including FRED-style `observation_date,SP500`), export, diagnostics, and responsive mobile layout.

Validated in Chrome:
- No page or console errors
- Controls and chart updates work
- CSV import/export works
- No horizontal overflow at desktop or mobile widths
- Works directly as a local HTML file, with no server or API required

The default series is explicitly synthetic; import trusted daily closes for a real analysis. Forecasts remain educational scenarios, not investment advice; historical and backtested results do not predict future performance. [SEC guidance](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-47)

## Tool / Command Summary

1. Started `codex exec --json --ignore-user-config --ignore-rules --skip-git-repo-check -C /tmp/benchmark-real-ai-gpt-5-6-terra-ultra-BzdnpU --sandbox danger-full-access --model gpt-5.6-terra -c model_reasoning_effort="ultra" --output-last-message /tmp/benchmark-real-ai-record-gpt-5-6-terra-ultra-8PERXz/final-response.md` in an empty temporary workspace, with only the required benchmark prompt as its user prompt.
2. The model checked its empty workspace, probed Stooq and Yahoo Finance, and used web search for risk disclosures. Stooq returned an anti-bot page and Yahoo returned HTTP 429, so no external market data was embedded in the shipped artifact.
3. Created one self-contained `index.html` containing the synthetic default series, transparent trend/drift/mean-reversion/naive forecasting choices, confidence fan, scenarios, diagnostics, CSV import, and CSV export.
4. Served the page locally and ran headless Chrome/Playwright validation for render state, interactive controls, tooltip behavior, export, ordinary and FRED-style CSV import, desktop/mobile overflow, accessibility semantics, and direct `file://` loading.
5. During the isolated run the model corrected its own early SVG and favicon issues and reran validation. The final interactive, FRED-style import, and local-file checks passed with no page or console errors.

## Imported Artifact Notes

- Original dashboard: `runs/original/openai-gpt-5-6-terra-ultra-codex-20260813.html`
- Displayed dashboard: `runs/rendered/openai-gpt-5-6-terra-ultra-codex-20260813.html`
- Original and displayed files are byte-identical. No post-run rendering repair was required.
- Clean Codex CLI event stream: `validation/openai-gpt-5-6-terra-ultra-codex-20260813.session.jsonl`
- Harness stderr: `validation/openai-gpt-5-6-terra-ultra-codex-20260813.stderr.log`
