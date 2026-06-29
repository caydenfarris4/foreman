// Records a walkthrough video of the "Build Your House" goal journey against
// the dev-only /preview/house route. Output is a .webm (Playwright's native
// video format). Run: node scripts/record-house-walkthrough.mjs
//
// Standalone on purpose (not a Playwright test) so it can drive its own paced,
// cinematic interaction and own video output path.
import { spawn } from "node:child_process";
import { mkdirSync, renameSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "@playwright/test";

const PORT = process.env.PORT || "3210";
const BASE = `http://localhost:${PORT}`;
const URL = `${BASE}/preview/house?house3d=on`;
const OUT_DIR = process.env.OUT_DIR || "/tmp/house-walkthrough";
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium";

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status === 200) return true;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  throw new Error(`Server did not become ready at ${url}`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  console.log("→ starting next dev on", PORT);
  const server = spawn("npx", ["next", "dev", "-p", PORT], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "development" },
    stdio: ["ignore", "inherit", "inherit"],
  });

  let browser;
  try {
    await waitForServer(URL, 150_000);
    console.log("→ server up; warming the preview route");
    // Hit it once so Next compiles the route + the 3D chunk before we record.
    await fetch(URL).catch(() => {});
    await sleep(3000);

    browser = await chromium.launch({
      executablePath: CHROMIUM,
      headless: true,
      args: [
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--ignore-gpu-blocklist",
        "--enable-webgl",
      ],
    });

    const viewport = { width: 440, height: 956 };
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      recordVideo: { dir: OUT_DIR, size: viewport },
    });
    const page = await context.newPage();
    const video = page.video();

    console.log("→ loading", URL);
    await page.goto(URL, { waitUntil: "load", timeout: 60_000 });
    // On-open construction animation + 3D fade-in.
    await sleep(6500);

    // Slow scroll down through the five stages (drives the GSAP plumb-line).
    console.log("→ scrolling through the stages");
    for (let i = 0; i < 13; i++) {
      await page.mouse.wheel(0, 300);
      await sleep(420);
    }
    await sleep(900);

    // Complete a couple of open goals at the bottom (board going up).
    console.log("→ completing goals");
    for (let i = 0; i < 2; i++) {
      const btn = page.getByRole("button", { name: "Mark complete" }).first();
      if (await btn.count()) {
        await btn.click().catch(() => {});
        await sleep(1100);
      }
    }
    await sleep(700);

    // Scroll back to the top — the hero house now reflects the new progress.
    console.log("→ scrolling back up");
    for (let i = 0; i < 14; i++) {
      await page.mouse.wheel(0, -320);
      await sleep(360);
    }
    await sleep(1200);

    // Scenario sweep: watch the whole house build, recede, and rebuild.
    console.log("→ scenario: finished");
    await page.getByTestId("scenario-finished").click();
    await sleep(3800);
    console.log("→ scenario: empty lot");
    await page.getByTestId("scenario-empty").click();
    await sleep(3000);
    console.log("→ scenario: mid-build");
    await page.getByTestId("scenario-progress").click();
    await sleep(4200);

    await context.close(); // finalizes the video
    const tmpPath = await video.path();
    const finalPath = `${OUT_DIR}/house-walkthrough.webm`;
    renameSync(tmpPath, finalPath);
    console.log("\n✓ video saved:", finalPath);
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
