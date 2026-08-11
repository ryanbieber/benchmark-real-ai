# Benchmark Real AI

**Same task. Different models. The work speaks for itself.**

Benchmark Real AI is a public, inspectable showcase of how AI models complete a practical task when used through real agent harnesses. Each entry records the model, reasoning level, harness, tools, output, and validation evidence.

## The task

Every run receives exactly this prompt:

> I want to forecast the sp500, show me how to do it in an interactive dashboard in html. Do not stop until you have a working and validated dashboard.

The project compares the complete model-plus-harness experience. A model used through Codex CLI is a different run from the same model used through another harness because the available tools and agent loop affect the result.

## What this is—and is not

- An honest showcase of finished work, run conditions, and validation.
- A repeatable way to inspect new models and reasoning settings.
- Not a universal model leaderboard.
- Not a test of future market accuracy.
- Not financial or investment advice.

The index intentionally contains no synthetic samples. It remains empty until genuine, validated runs are contributed.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:4173>.

## Validate

```bash
npm run validate
npm test
```

`validate` checks the manifest, artifact paths, hashes, score totals, harness metadata, and repair disclosures. The full test suite also exercises the public pages in a browser.

## Add a model run

Read [`AGENTS.md`](AGENTS.md) first, then follow [`CONTRIBUTING.md`](CONTRIBUTING.md). New runs are added through pull requests so the result and its provenance remain reviewable.

## License

Site code and documentation are available under the [MIT License](LICENSE). Submitted model outputs remain subject to any applicable provider and contributor terms.
