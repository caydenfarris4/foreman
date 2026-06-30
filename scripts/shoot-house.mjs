// Captures still screenshots of the house at several build levels / tiers.
// Lighter than video (short render bursts), so it's reliable in the sandbox and
// shows the procedural-texture detail crisply. Run: node scripts/shoot-house.mjs
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "@playwright/test";

const PORT = process.env.PORT || "3216";
const BASE = `http://localhost:${PORT}`;
const OUT = process.env.OUT_DIR || "/tmp/house-shots";
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium";

const SHOTS = process.env.WIZARD
  ? [
      { name: "wizard-intro", q: "view=wizard&house3d=on&tier=standard&scenario=empty", wait: 5000 },
      { name: "journey-foundation", q: "house3d=off&scenario=empty", wait: 3500 },
    ]
  : [
      { name: "1-high-finished", q: "house3d=on&tier=high&scenario=finished", wait: 5500 },
      { name: "2-high-midbuild", q: "house3d=on&tier=high&scenario=progress", wait: 5000 },
      { name: "3-standard-finished", q: "house3d=on&tier=standard&scenario=finished", wait: 5000 },
      { name: "4-2d-finished", q: "house3d=off&scenario=finished", wait: 3500 },
    ];

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url, { redirect: "manual" })).status === 200) return;
    } catch {
      /* not up */
    }
    await sleep(1000);
  }
  throw new Error("server never became ready");
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = spawn("npx", ["next", "dev", "-p", PORT], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "development" },
    stdio: ["ignore", "inherit", "inherit"],
  });

  let browser;
  try {
    const warm = `${BASE}/preview/house?house3d=on&tier=standard`;
    await waitForServer(warm, 150_000);
    await fetch(warm).catch(() => {});
    await sleep(4000); // let the 3D chunk compile once

    browser = await chromium.launch({
      executablePath: CHROMIUM,
      headless: true,
      args: [
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--ignore-gpu-blocklist",
      ],
    });
    const ctx = await browser.newContext({
      viewport: { width: 460, height: 1000 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    for (const shot of SHOTS) {
      const url = `${BASE}/preview/house?${shot.q}`;
      console.log("→", shot.name, url);
      await page.goto(url, { waitUntil: "load", timeout: 60_000 });
      await sleep(shot.wait);
      await page.screenshot({ path: `${OUT}/${shot.name}.png` });
      console.log("  saved", `${OUT}/${shot.name}.png`);
    }
    await ctx.close();
    console.log("\n✓ screenshots in", OUT);
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
