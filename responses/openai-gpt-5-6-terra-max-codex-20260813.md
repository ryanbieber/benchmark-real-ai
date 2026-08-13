# Benchmark Run Record

- Run ID: `openai-gpt-5-6-terra-max-codex-20260813`
- Model: `openai / gpt-5.6-terra`
- Reasoning: native `max`, normalized `max`
- Harness: `Codex CLI 0.144.4`, interface `exec`
- Workspace: fresh temporary workspace at `/tmp/benchmark-real-ai-gpt-5-6-terra-max-vlJktU`
- Data source: `historical-snapshot` (a bundled FRED-format S&P 500 close snapshot)
- Status: completed and browser-validated; original and displayed HTML are byte-identical, with no rendering repair
- Timing: `2026-08-13T11:29:29.595Z` to `2026-08-13T11:41:20.821Z` (`711.226` seconds)

## Collection Protocol

The benchmark ran in an empty workspace outside this repository. The one user message delivered to the tested model was the exact benchmark prompt below; no repository context, implementation guidance, or follow-up user messages were supplied. Codex's ordinary harness/tool context remained enabled.

~~~text
I want to forecast the sp500, show me how to do it in an interactive dashboard in html. Do not stop until you have a working and validated dashboard.
~~~

## Final Visible Response (verbatim)

~~~text
Done — the working dashboard is in [index.html](/tmp/benchmark-real-ai-gpt-5-6-terra-max-vlJktU/index.html).

It includes adjustable models, horizon and interval controls, an interactive canvas chart, rolling backtests, projection checkpoints, and CSV import/reset support. It ships with a 761-close S&P 500 snapshot and runs without dependencies.

Validated in Chrome: controls, forecast intervals, tooltips, CSV import/reset, backtests, and responsive rendering all passed.
~~~

The untouched final-response bytes are also preserved at `validation/openai-gpt-5-6-terra-max-codex-20260813.final-response.md`.

## Tool / Command Summary

1. Started `codex exec --json --ignore-user-config --ignore-rules --skip-git-repo-check -C /tmp/benchmark-real-ai-gpt-5-6-terra-max-vlJktU --sandbox danger-full-access --model gpt-5.6-terra -c model_reasoning_effort="max" --output-last-message /tmp/benchmark-real-ai-record-gpt-5-6-terra-max-emSIQ3/final-response.md`, passing only the exact benchmark prompt as the user input.
2. Confirmed the clean workspace, inspected local Node and Chrome availability, and probed several public market-data endpoints. FRED's S&P 500 CSV was successfully fetched during the run; the completed dashboard embeds a fixed FRED-format snapshot rather than requiring a runtime request.
3. Created a dependency-free `index.html` containing a bundled 761-close history, selectable blended/momentum/random-walk baselines, lookback/horizon/confidence controls, prediction intervals, canvas hover details, rolling-origin backtest metrics, projection checkpoints, CSV import, and reset support.
4. Extracted and syntax-checked the inline JavaScript, served the artifact with `python3 -m http.server 4173`, and rendered it with headless Chrome.
5. Used Chrome DevTools Protocol automation to exercise model, horizon, interval, CSV-import/reset, tooltip, backtest, and checkpoint paths. Two intermediate assertions exposed model-authored edge cases; the model repaired its own artifact and reran the final interaction test successfully with no failures.
6. Captured desktop and mobile Chrome screenshots, then confirmed the 390px viewport had `scrollWidth === innerWidth === 390` and all observed element bounds stayed within the viewport.

## Repository Verification

- `npm install` completed successfully, adding the repository's three development packages and reporting zero vulnerabilities.
- `npm run validate` first passed with 21 runs checked after import; after rebasing onto the current mainline, final validation passed with 22 runs checked.
- The first ordinary `npm test` invocation encountered an unrelated server from another workspace already listening on port 4321; Playwright's configured `reuseExistingServer` then tested that stale 20-run site rather than this checkout. No repository code or artifact was implicated.
- The same `npm test` command was rerun through a temporary, restored Playwright local-port override that served this checkout on port 4322. It passed all 5 unit tests and 5 browser tests, with 1 intentional desktop-project skip; the final rebased tree passed the same suite again.
- In the in-app browser, the exact new table row and its model link each resolved once. Clicking the model link opened `runs/rendered/openai-gpt-5-6-terra-max-codex-20260813.html`, with the `S&P 500 Forecast Lab` title, 761-row snapshot disclosure, populated forecast/backtest/checkpoint values, and no browser error logs.

## Imported Artifact Notes

- Original dashboard: `runs/original/openai-gpt-5-6-terra-max-codex-20260813.html`
- Displayed dashboard: `runs/rendered/openai-gpt-5-6-terra-max-codex-20260813.html`
- The HTML files are byte-identical (`602aa6ec72bc7a3a8c47c8c7554d2124974adcfeec0423387f4dbd835ad507e6`); no post-run rendering repair was made.
- The benchmark's desktop and mobile screenshots are retained under `validation/`.
- The raw Codex session JSONL is deliberately not published because it contains hidden harness context and encrypted reasoning. The visible final response, concise tool/command evidence, and final usage event are preserved instead, consistent with `AGENTS.md`.
- The final cumulative usage event reported 1,256,837 input tokens, 1,122,816 cached-input tokens, 33,389 output tokens, and 11,425 reasoning-output tokens. Total tokens are 1,290,226 (`input + output`); cached input and reasoning output remain subsets.
- Actual billed cost, time-to-first-token, and model latency were not reported and are recorded as `null`.
