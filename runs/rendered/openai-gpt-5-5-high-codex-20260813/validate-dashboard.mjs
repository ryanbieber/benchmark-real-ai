import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const port = 4173;
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
  const file = pathname === "/" ? "index.html" : pathname.slice(1);
  try {
    const body = await readFile(join(root, file));
    response.writeHead(200, {
      "content-type": contentType(file),
      "cache-control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});

await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

const chrome = spawn(
  "google-chrome",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-port=9222",
    "--window-size=1440,1000",
    "about:blank",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);

try {
  await wait(900);
  const tabs = await json("http://127.0.0.1:9222/json");
  const page = tabs.find((tab) => tab.type === "page");
  if (!page) throw new Error("No Chrome page target found");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await onceOpen(ws);
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const callId = ++id;
      pending.set(callId, (message) => {
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      });
      ws.send(JSON.stringify({ id: callId, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: `http://127.0.0.1:${port}/index.html` });
  await waitFor(() => evaluate(send, "document.readyState").then((v) => v === "complete"));
  await waitFor(() =>
    evaluate(send, "document.querySelector('#lastClose').textContent !== '-'"),
  );

  await evaluate(
    send,
    `
    document.querySelector('#horizon').value = 6;
    document.querySelector('#horizon').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#model').value = 'momentum';
    document.querySelector('#model').dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#shock').value = -5;
    document.querySelector('#shock').dispatchEvent(new Event('input', { bubbles: true }));
    true
  `,
  );
  await wait(300);

  const result = await evaluate(
    send,
    `(() => {
      const canvases = [...document.querySelectorAll('canvas')];
      const metrics = ['#lastClose', '#forecastMedian', '#probPositive'].map((selector) => document.querySelector(selector).textContent);
      const rows = document.querySelectorAll('#forecastRows tr').length;
      const canvasesReady = canvases.every((canvas) => canvas.width > 300 && canvas.height > 180);
      const nonBlank = canvases.map((canvas) => {
        const ctx = canvas.getContext('2d');
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] < 245 || pixels[i + 1] < 245 || pixels[i + 2] < 245) return true;
        }
        return false;
      });
      return { metrics, rows, canvasesReady, nonBlank, horizon: document.querySelector('#horizonValue').textContent, model: document.querySelector('#model').value };
    })()`,
  );

  if (!result.canvasesReady) throw new Error("Canvas dimensions did not initialize");
  if (result.nonBlank.some((ready) => !ready)) throw new Error("One or more charts are blank");
  if (result.rows < 4) throw new Error("Forecast table did not render");
  if (result.horizon !== "6 months" || result.model !== "momentum") {
    throw new Error("Interactive controls did not update state");
  }
  if (result.metrics.some((text) => !text || text === "-")) {
    throw new Error(`Metrics incomplete: ${result.metrics.join(", ")}`);
  }

  await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }).then(
    async ({ data }) => {
      await import("node:fs/promises").then((fs) =>
        fs.writeFile("dashboard-validation.png", Buffer.from(data, "base64")),
      );
    },
  );

  console.log("Dashboard validation passed");
  console.log(JSON.stringify(result, null, 2));
  ws.close();
} finally {
  chrome.kill("SIGTERM");
  server.close();
}

function contentType(file) {
  return {
    ".html": "text/html; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".png": "image/png",
  }[extname(file)] || "application/octet-stream";
}

async function evaluate(send, expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Evaluation failed");
  }
  return result.result.value;
}

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed ${url}: ${response.status}`);
  return response.json();
}

async function waitFor(check, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await check()) return;
    await wait(150);
  }
  throw new Error("Timed out waiting for browser condition");
}

function onceOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
