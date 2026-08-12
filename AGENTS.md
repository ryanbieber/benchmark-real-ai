# Benchmark Real AI — Agent Instructions

These instructions apply to the entire repository. They are the source of truth for every future benchmark addition.

## Goal

Show how a specific AI model, reasoning setting, and harness combination completes the same practical task. This is an observational showcase, not a scientific leaderboard and not investment advice.

Every benchmark run must use this exact prompt, including capitalization and punctuation:

> I want to forecast the sp500, show me how to do it in an interactive dashboard in html. Do not stop until you have a working and validated dashboard.

Do not add instructions to the benchmark prompt. Do not follow up with implementation help after the run begins.

## What counts as a run

A run is one model + reasoning setting + harness combination. The harness is part of the result. The same model used in two harnesses is two separate runs.

- Start in a fresh workspace with no files from a previous run.
- Let the model use the normal capabilities of the recorded harness, including file editing, commands, browsing, and browser validation.
- Do not manually implement, repair, or steer the dashboard while the run is active.
- End only when the harness reports completion or reaches an unrecoverable limit.
- Never publish hidden chain-of-thought. Preserve only user-visible responses, tool summaries, commands, and validation evidence.

## Required evidence

Each run must add all of the following:

1. The original, unmodified HTML produced by the run.
2. The HTML displayed by the showcase.
3. A Markdown run record containing the final visible response and a concise tool/command summary.
4. Validation evidence, including commands, outcomes, and any unresolved failures.
5. A `data/runs.json` entry with:
   - Full provider and model identifiers.
   - Native reasoning setting and normalized reasoning band.
   - Harness name, version, interface, relevant configuration, and enabled capabilities.
   - UTC start and finish timestamps plus wall-clock duration.
   - Input, cached-input, output, reasoning-output, and total token counts from the harness's final usage event.
   - Actual billed cost when available; use `null` when the harness does not report it.
   - Data-source classification: `live`, `historical-snapshot`, `synthetic`, or `undocumented`.
   - Artifact paths and SHA-256 hashes.
   - Manual rubric scores and reviewer notes.

Do not guess unavailable metadata.

Cached input is a subset of input, and reasoning output is a subset of output. Therefore `totalTokens` must equal `inputTokens + outputTokens`; never add cached or reasoning tokens again. Preserve the final harness usage event in validation evidence or identify the exact event source.

## Cost comparison

The homepage cost chart is an API-equivalent estimate, not a Codex subscription charge or a claim about the contributor's bill. It must calculate cost from recorded tokens and a dated OpenAI pricing snapshot:

`((inputTokens - cachedInputTokens) × input rate) + (cachedInputTokens × cached rate) + (outputTokens × output rate)`

Divide by the pricing unit recorded in the manifest. Use only official OpenAI pricing, record the retrieval date, service tier, and context band, and never charge reasoning output separately. Add verified current pricing for a new OpenAI model before publishing its run.

## Repairs

The showcase may repair an artifact only enough to make it render. A repair must not improve the forecast, data, explanation, visual design, or interaction model.

- Preserve the original file unchanged.
- Put the minimally repaired file in `runs/rendered/`.
- Add a Markdown repair log describing every change.
- Score technical robustness from the original result, not the repaired display.
- Set `repaired: true` in the manifest.

If no repair is required, the original and displayed files may contain identical bytes and `repairLog` must be `null`.

## Evaluation

Score the original result from 0–5 in each category:

- `taskFulfillment`
- `interactivityUsability`
- `forecastingMethodology`
- `uncertaintyHonesty`
- `technicalRobustness`

The total must equal the five scores added together. Scores describe observable behavior and must include a short reviewer note.

## Addition checklist

Before opening a pull request:

1. Add the response, original artifact, displayed artifact, and validation evidence.
2. Add or update the manifest entry without changing existing run records.
3. Run `npm run validate`.
4. Run `npm test`.
5. Confirm the standalone dashboard opens directly from its table row.
6. Confirm synthetic, repaired, and failed states are visibly disclosed.
7. Describe the model, reasoning setting, harness, validation outcome, and any repairs in the pull request.

Do not reorder results to manufacture a winner, silently replace an artifact, or describe an S&P 500 forecast as financial advice.
