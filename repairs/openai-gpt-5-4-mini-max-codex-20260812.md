# Rendering Repair

The benchmark HTML was preserved unchanged in `runs/original/openai-gpt-5-4-mini-max-codex-20260812.html`.

To make the published dashboard open cleanly from the table row in the repository layout, the rendered copy was repaired in two minimal steps:

1. The script source in `runs/rendered/openai-gpt-5-4-mini-max-codex-20260812.html` was changed from `./sp500-data.js` to `./openai-gpt-5-4-mini-max-codex-20260812.sp500-data.js`.
2. The companion data asset was copied to `runs/rendered/openai-gpt-5-4-mini-max-codex-20260812.sp500-data.js`.

No dashboard logic, layout, forecasting behavior, or visible content was changed beyond that local asset path repair.
