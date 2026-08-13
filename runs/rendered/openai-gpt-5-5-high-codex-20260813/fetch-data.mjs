import { writeFile } from "node:fs/promises";

const url =
  "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=10y&interval=1d";

const response = await fetch(url, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; local-sp500-dashboard/1.0; +https://finance.yahoo.com/quote/%5EGSPC/history/)",
  },
});

if (!response.ok) {
  throw new Error(`Yahoo chart request failed: ${response.status}`);
}

const payload = await response.json();
const result = payload.chart?.result?.[0];
if (!result) {
  throw new Error(payload.chart?.error?.description || "No chart result returned");
}

const timestamps = result.timestamp || [];
const quote = result.indicators?.quote?.[0] || {};
const rows = timestamps
  .map((unix, index) => {
    const close = quote.close?.[index];
    if (!Number.isFinite(close)) return null;
    return {
      date: new Date(unix * 1000).toISOString().slice(0, 10),
      open: round(quote.open?.[index]),
      high: round(quote.high?.[index]),
      low: round(quote.low?.[index]),
      close: round(close),
    };
  })
  .filter(Boolean);

if (rows.length < 252) {
  throw new Error(`Expected at least one year of data, received ${rows.length} rows`);
}

const data = {
  symbol: result.meta?.symbol || "^GSPC",
  name: "S&P 500 Index",
  currency: result.meta?.currency || "USD",
  source: "Yahoo Finance chart endpoint",
  sourceUrl: url,
  generatedAt: new Date().toISOString(),
  firstDate: rows[0].date,
  lastDate: rows.at(-1).date,
  rows,
};

await writeFile("sp500-data.json", `${JSON.stringify(data, null, 2)}\n`);
console.log(
  `Wrote sp500-data.json with ${rows.length} rows (${data.firstDate} to ${data.lastDate})`,
);

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}
