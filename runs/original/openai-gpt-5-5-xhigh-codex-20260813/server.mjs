import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const fredUrl = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "cache-control": "no-store",
    ...headers
  });
  res.end(body);
}

async function proxySp500(res) {
  try {
    const upstream = await fetch(fredUrl, {
      headers: {
        "user-agent": "sp500-forecast-dashboard/1.0"
      }
    });

    if (!upstream.ok) {
      send(res, 502, "FRED returned HTTP " + upstream.status, {
        "content-type": "text/plain; charset=utf-8"
      });
      return;
    }

    send(res, 200, await upstream.text(), {
      "content-type": "text/csv; charset=utf-8"
    });
  } catch (error) {
    send(res, 502, "Unable to load FRED data: " + error.message, {
      "content-type": "text/plain; charset=utf-8"
    });
  }
}

async function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const normalized = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(root, normalized));

  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden", { "content-type": "text/plain; charset=utf-8" });
    return;
  }

  try {
    const body = await readFile(filePath);
    send(res, 200, body, {
      "content-type": types[extname(filePath)] || "application/octet-stream"
    });
  } catch {
    send(res, 404, "File not found", { "content-type": "text/plain; charset=utf-8" });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://" + req.headers.host);
  if (url.pathname === "/api/sp500") {
    await proxySp500(res);
    return;
  }
  await serveStatic(req, res, url.pathname);
});

server.listen(port, "127.0.0.1", () => {
  console.log("S&P 500 dashboard running at http://127.0.0.1:" + port + "/");
});
