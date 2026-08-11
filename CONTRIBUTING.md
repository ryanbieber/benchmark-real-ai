# Contributing a benchmark run

Thanks for helping make model comparisons more concrete. Before collecting anything, read [`AGENTS.md`](AGENTS.md); it contains the non-negotiable protocol.

## Collection

1. Choose a model, native reasoning setting, and harness.
2. Record the harness name and version before the run.
3. Start from a fresh workspace and submit the exact benchmark prompt once.
4. Allow the harness's normal tools. Do not provide follow-up guidance.
5. Save the original HTML, visible final response, tool/command summary, and validation evidence.
6. Classify the dashboard's market data honestly.

## Running the benchmark with Codex

Use two separate Codex sessions. Do not run the benchmark session from inside this repository: Codex would read `AGENTS.md`, adding repository context that other benchmark runs may not receive.

### Session 1: collect the benchmark artifact

1. Create and open a fresh, empty workspace.
2. Select the model and reasoning level you want to test.
3. Record the model, reasoning level, Codex version, and enabled capabilities.
4. Paste only this exact prompt:

```text
I want to forecast the sp500, show me how to do it in an interactive dashboard in html. Do not stop until you have a working and validated dashboard.
```

Do not mention this repository and do not send follow-up instructions. Let the model finish using Codex's normal tools.

### Session 2: import the completed run

Open a new Codex session inside a clone of this repository, then paste the following prompt after replacing the bracketed path:

```text
Import the completed benchmark run from [PATH TO THE FRESH WORKSPACE] into this repository. Follow AGENTS.md exactly. Preserve the original artifact, record the model, reasoning level, Codex harness version and capabilities, add validation evidence, update data/runs.json, run all tests, and open a pull request. Do not alter the dashboard except for explicitly documented rendering repairs.
```

The import session may organize and document the result, but it must not improve the benchmark artifact.

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
