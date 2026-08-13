# Rendering Repair

The benchmark HTML and its support assets are preserved unchanged in:

- `runs/original/openai-gpt-5-6-sol-high-codex-20260813.html`
- `runs/original/openai-gpt-5-6-sol-high-codex-20260813.styles.css`
- `runs/original/openai-gpt-5-6-sol-high-codex-20260813.app.js`

The generated HTML referred to generic sibling filenames, `styles.css` and `app.js`. Those names are unsafe in the repository's shared `runs/rendered/` directory because multiple benchmark dashboards can include different files with the same generic names.

To make the table-row link open this dashboard with its own original support assets, the displayed copy received two strictly necessary path changes:

1. `styles.css` was changed to `openai-gpt-5-6-sol-high-codex-20260813.styles.css`.
2. `app.js` was changed to `openai-gpt-5-6-sol-high-codex-20260813.app.js`.

The displayed CSS and JavaScript are byte-identical copies of the benchmark-generated files. No dashboard logic, data, forecast, explanation, design, or interaction behavior was changed.
