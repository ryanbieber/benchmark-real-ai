# Contributing a benchmark run

Thanks for helping make model comparisons more concrete. Before collecting anything, read [`AGENTS.md`](AGENTS.md); it contains the non-negotiable protocol.

## Collection

1. Choose a model, native reasoning setting, and harness.
2. Record the harness name and version before the run.
3. Start from a fresh workspace and submit the exact benchmark prompt once.
4. Allow the harness's normal tools. Do not provide follow-up guidance.
5. Save the original HTML, visible final response, tool/command summary, and validation evidence.
6. Classify the dashboard's market data honestly.

## Files

Use a stable lowercase run ID such as `provider-model-reasoning-harness-yyyymmdd`.

- `runs/original/<id>.html` — untouched output.
- `runs/rendered/<id>.html` — displayed output; identical to the original unless a disclosed rendering repair was necessary.
- `responses/<id>.md` — visible response and run summary.
- `validation/<id>.json` — structured validation evidence.
- `repairs/<id>.md` — required only when the displayed artifact differs from the original.

Add the corresponding object to `data/runs.json`. Use `null` for facts the harness did not report. Never estimate tokens, cost, or latency.

## Review

Run:

```bash
npm install
npm run validate
npm test
```

In the pull request, state the model, reasoning setting, harness, data classification, validation outcome, and every repair. Pull requests that omit provenance or silently alter model output will not be accepted.
