// WebGL-safe visual harness. Chrome's --screenshot misses animated WebGL frames,
// so this drives the installed Chrome via Playwright with real device viewports.
// Usage: node .qa/shoot.mjs <prefix> <desktop|mobile|both>
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", ".qa", "shots");
mkdirSync(OUT, { recursive: true });

const prefix = process.argv[2] ?? "run";
const which = process.argv[3] ?? "both";
const scheme = process.argv[4] ?? "light";

const PAGES = [
  ["home", "/"],
  ["routes", "/routes"],
  ["route_detail", "/routes/usd"],
  ["node_ai", "/nodes/ai"],
  ["node_papers", "/nodes/ai?tab=papers"],
  ["node_timeline", "/nodes/ai?tab=timeline"],
  ["search", "/search?q=diffusion"],
  ["watchlist", "/watchlist"],
  ["paper_detail", "/papers/1"],
  ["notfound", "/nodes/__nope__"],
];

const VIEWPORTS =
  which === "desktop"
    ? [["1440", { width: 1440, height: 900 }]]
    : which === "mobile"
      ? [["390", { width: 390, height: 844 }]]
      : [
          ["1440", { width: 1440, height: 900 }],
          ["390", { width: 390, height: 844 }],
        ];

const browser = await chromium.launch({ channel: "chrome" });
const problems = [];

for (const [wtag, viewport] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: scheme });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`);
  });

  for (const [name, route] of PAGES) {
    try {
      await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle", timeout: 45000 });
    } catch (e) {
      problems.push(`${name}@${wtag}: goto failed ${e.message}`);
      continue;
    }
    await page.waitForTimeout(1400);
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      const out = { scrollW: de.scrollWidth, clientW: de.clientWidth, culprits: [] };
      if (de.scrollWidth > de.clientWidth + 1) {
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.right > de.clientWidth + 1 && r.width > 40) {
            out.culprits.push(
              `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ").slice(0, 2).join(".")}` +
                ` right=${Math.round(r.right)} w=${Math.round(r.width)}`
            );
            if (out.culprits.length >= 4) break;
          }
        }
      }
      return out;
    });
    if (overflow.scrollW > overflow.clientW + 1) {
      problems.push(`${name}@${wtag}: H-OVERFLOW ${overflow.scrollW} > ${overflow.clientW} :: ${overflow.culprits.join("; ")}`);
    }
    await page.screenshot({ path: join(OUT, `${prefix}_${name}_${wtag}.png`) });
    await page.screenshot({ path: join(OUT, `${prefix}_${name}_${wtag}_full.png`), fullPage: true });
    if (errors.length) problems.push(`${name}@${wtag}: ${errors.slice(0, 3).join(" | ")}`);
    console.log(`ok ${name}@${wtag} sw=${overflow.scrollW}`);
    errors.length = 0;
  }
  await ctx.close();
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS:\n- ${problems.join("\n- ")}` : "\nno problems detected");
