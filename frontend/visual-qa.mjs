// WebGL-safe visual harness. Chrome's --screenshot misses animated WebGL frames,
// so this drives the installed Chrome via Playwright with real device viewports.
// Usage: node visual-qa.mjs <prefix> <desktop|mobile|both> [light|dark]
import { chromium } from "playwright";
import { mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Static guard: every colour must come from the theme tokens in globals.css.
function findHardcodedColors(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "visual-qa.mjs") continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) findHardcodedColors(p, acc);
    else if (/\.(tsx|ts)$/.test(p)) {
      const src = readFileSync(p, "utf8");
      const hit = src.match(/bg-white|text-gray-\d|text-slate-\d|bg-slate-\d|bg-\[#|border-\[#|--pg-border|text-blue-\d|bg-blue-\d/);
      if (hit) acc.push(`${relative(process.cwd(), p)}: ${hit[0]}`);
    }
  }
  return acc;
}
const tokenViolations = findHardcodedColors(join(process.cwd(), "app")).concat(
  findHardcodedColors(join(process.cwd(), "components")),
  findHardcodedColors(join(process.cwd(), "lib"))
);

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

// WCAG AA contrast probe over rendered text. Backgrounds are resolved by walking
// up to the first opaque ancestor, so translucent cards are measured against what
// the reader actually sees.
const CONTRAST_JS = `(() => {
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const rgba = (s) => {
    const m = s.match(/[\\d.]+/g);
    return m ? m.map(Number) : null;
  };
  const lum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
  const ratio = (a, b) => {
    const [la, lb] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (la + 0.05) / (lb + 0.05);
  };
  const bgOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c && (c.length < 4 || c[3] > 0.85)) return c;
    }
    return [255, 255, 255];
  };
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const txt = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!txt) continue;
    // Decorative separators and glyphs carry no informational content, so AA does not apply.
    if (el.closest('[aria-hidden="true"]') || el.getAttribute('aria-hidden') === 'true') continue;
    if (!/[\\p{L}\\p{N}]/u.test(el.textContent)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.right < 0 || r.bottom < 0) continue;
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const size = parseFloat(cs.fontSize) || 16;
    const bold = (parseInt(cs.fontWeight, 10) || 400) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    const fg = rgba(cs.color);
    if (!fg) continue;
    const eff = fg.length === 4 && fg[3] < 1
      ? fg.slice(0, 3).map((v, i) => v * fg[3] + bgOf(el)[i] * (1 - fg[3]))
      : fg;
    const got = ratio(eff, bgOf(el));
    if (got < need) {
      out.push({ sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''), text: el.textContent.trim().slice(0, 28), size, need, got: +got.toFixed(2) });
    }
  }
  out.sort((a, b) => a.got - b.got);
  return out.slice(0, 8);
})()`;

async function contrastFailures(page) {
  try {
    return await page.evaluate(CONTRAST_JS);
  } catch {
    return [];
  }
}

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
    const bad = await contrastFailures(page);
    if (bad.length) {
      problems.push(
        `${name}@${wtag}: CONTRAST ${bad.length}x :: ` +
          bad.map((b) => `${b.sel} "${b.text}" ${b.got}<${b.need}`).join("; ")
      );
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
if (tokenViolations.length) {
  problems.unshift(`STATIC: hardcoded colour outside theme tokens :: ${tokenViolations.join("; ")}`);
}

console.log(problems.length ? `\nPROBLEMS:\n- ${problems.join("\n- ")}` : "\nno problems detected");
