import { writeFile } from "node:fs/promises";

const SOURCE_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500";
const OUTPUT_PATH = new URL("./sp500_data.json", import.meta.url);

const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status} ${response.statusText}`);
}

const csv = await response.text();
const lines = csv.trim().split(/\r?\n/);
const rows = [];

for (let i = 1; i < lines.length; i += 1) {
  const [date, value] = lines[i].split(",");
  if (!date || !value || value === ".") {
    continue;
  }

  const close = Number(value);
  if (!Number.isFinite(close)) {
    continue;
  }

  rows.push({ date, close });
}

const payload = {
  source: SOURCE_URL,
  series: "FRED SP500",
  generatedAt: new Date().toISOString(),
  startDate: rows[0]?.date ?? null,
  endDate: rows.at(-1)?.date ?? null,
  points: rows.length,
  rows,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${rows.length} rows to ${OUTPUT_PATH.pathname}`);
