# Repair Log

The benchmark run required rendering repairs only.

Changes made to the displayed HTML:

- Initialized the hover marker circle so the serialized SVG no longer emits `NaN` coordinates before pointer movement.
- Restored the chart state to return the first forecast point explicitly and kept the projected-end summary tied to the computed forecast output.
- Tightened the forecast-start label positioning so the right-edge text no longer clips.

No forecasting logic, data source, or dashboard interaction model was changed.

The original HTML is preserved in `runs/original/openai-gpt-5-4-mini-high-codex-20260811.html`.
The repaired display version is in `runs/rendered/openai-gpt-5-4-mini-high-codex-20260811.html`.
