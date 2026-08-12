import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import fs from "node:fs/promises";
import path from "node:path";

const root = "/tmp/benchmark-real-ai.aK0gP7";
const pageUrl = `file://${path.join(root, "index.html")}`;
const screenshotPath = path.join(root, "dashboard-validation.png");
const chromeProfile = path.join(root, ".chrome-profile");
const debugPort = 9222;

async function waitForJson(url, attempts = 60) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch {}
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function createCdpClient(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    if (!payload.id) {
      return;
    }
    const handlers = pending.get(payload.id);
    if (!handlers) {
      return;
    }
    pending.delete(payload.id);
    if (payload.error) {
      handlers.reject(new Error(payload.error.message));
      return;
    }
    handlers.resolve(payload.result);
  });

  function send(method, params = {}) {
    const id = nextId;
    nextId += 1;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
  }

  const opened = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  return {
    opened,
    send,
    close() {
      socket.close();
    }
  };
}

async function waitForReady(cdp, previousJson = null, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    const result = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const node = document.getElementById("readyFlag");
        return node ? { ready: node.dataset.ready, text: node.textContent } : { ready: "missing", text: "" };
      })()`,
      returnByValue: true
    });

    const { ready, text } = result.result.value;
    if (ready === "true" && text && text !== previousJson) {
      return JSON.parse(text);
    }

    await delay(250);
  }

  throw new Error("Dashboard did not report a ready state.");
}

async function run() {
  await fs.rm(chromeProfile, { recursive: true, force: true });

  const chrome = spawn("google-chrome", [
    `--remote-debugging-port=${debugPort}`,
    "--headless=new",
    "--disable-gpu",
    `--user-data-dir=${chromeProfile}`,
    "--window-size=1440,2200",
    pageUrl
  ], { stdio: ["ignore", "pipe", "pipe"] });

  let stderr = "";
  chrome.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
    const target = targets.find((entry) => entry.url === pageUrl);
    if (!target) {
      throw new Error("Chrome did not expose the dashboard target.");
    }

    const cdp = createCdpClient(target.webSocketDebuggerUrl);
    await cdp.opened;
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    const defaultRun = await waitForReady(cdp);

    const secondRunExpression = `(() => {
      document.getElementById("readyFlag").dataset.ready = "false";
      document.getElementById("model").value = "drift";
      document.getElementById("horizon").value = "15";
      document.getElementById("holdout").value = "20";
      document.getElementById("historyWindow").value = "252";
      document.getElementById("recalculate").click();
      return true;
    })()`;
    await cdp.send("Runtime.evaluate", {
      expression: secondRunExpression,
      returnByValue: true
    });

    const driftRun = await waitForReady(cdp, JSON.stringify(defaultRun));

    const screenshot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true
    });
    await fs.writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

    cdp.close();

    return { defaultRun, driftRun };
  } finally {
    chrome.kill("SIGTERM");
    await delay(300);
    if (chrome.exitCode === null) {
      chrome.kill("SIGKILL");
    }
    if (stderr.trim()) {
      await fs.writeFile(path.join(root, "validate-dashboard.stderr.log"), stderr);
    }
  }
}

run()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
