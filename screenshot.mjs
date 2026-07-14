// Usage: node screenshot.mjs <url> [label] [demoRole]
//   demoRole: provider | provider_ocular | provider_wound2 | clinic_staff | admin
// Saves to ./temporary screenshots/screenshot-N[-label].png (auto-incremented).
import { createRequire } from "node:module";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const require = createRequire("C:/Users/Asi/AppData/Local/Temp/puppeteer-test/index.js");
const puppeteer = require("puppeteer-core");

const CHROME = "C:/Users/Asi/.cache/puppeteer/chrome/win64-150.0.7871.24/chrome-win64/chrome.exe";
const OUT_DIR = join(process.cwd(), "temporary screenshots");

const [url, label, demoRole] = process.argv.slice(2);
if (!url) {
  console.error("Usage: node screenshot.mjs <url> [label] [demoRole]");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const nums = readdirSync(OUT_DIR)
  .map((f) => /^screenshot-(\d+)/.exec(f)?.[1])
  .filter(Boolean)
  .map(Number);
const next = (nums.length ? Math.max(...nums) : 0) + 1;
const file = join(OUT_DIR, `screenshot-${next}${label ? `-${label}` : ""}.png`);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  if (demoRole) {
    await browser.setCookie({
      name: "demo_role",
      value: demoRole,
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
    });
  }
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
} finally {
  await browser.close();
}
