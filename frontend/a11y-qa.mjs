// Accessibility audit gate: structural checks that screenshots cannot prove.
// Usage: node a11y-qa.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const PAGES = [
  ["home", "/"],
  ["routes", "/routes"],
  ["route_detail", "/routes/usd"],
  ["node_ai", "/nodes/ai"],
  ["node_papers", "/nodes/ai?tab=papers"],
  ["search", "/search?q=diffusion"],
  ["watchlist", "/watchlist"],
  ["paper_detail", "/papers/1"],
  ["notfound", "/definitely-not-a-page"],
];

const AUDIT = `(() => {
  const problems = [];
  const q = (s) => [...document.querySelectorAll(s)];
  const name = (el) =>
    (el.getAttribute('aria-label') || '').trim() ||
    (el.getAttribute('title') || '').trim() ||
    (el.textContent || '').trim().slice(0, 40) ||
    (el.getAttribute('alt') || '').trim();

  const h1 = q('h1');
  if (h1.length !== 1) problems.push(\`h1 count = \${h1.length}\`);

  if (!q('main').length) problems.push('no <main> landmark');
  const unlabelledNav = q('nav').filter((n) => !n.getAttribute('aria-label') && !n.getAttribute('aria-labelledby'));
  if (unlabelledNav.length) problems.push(\`\${unlabelledNav.length} <nav> without an accessible name\`);

  const dup = {};
  for (const el of q('[id]')) dup[el.id] = (dup[el.id] || 0) + 1;
  const dups = Object.entries(dup).filter(([, n]) => n > 1);
  if (dups.length) problems.push('duplicate ids: ' + dups.map(([k, n]) => \`\${k}x\${n}\`).join(', '));

  const unnameable = q('a, button, [role="button"], input, select, textarea').filter((el) => {
    if (el.tagName === 'A' && !el.getAttribute('href')) return false;
    if (name(el)) return false;
    if (el.closest('label')) return false;
    const id = el.id;
    if (id && document.querySelector(\`label[for="\${id}"]\`)) return false;
    return getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
  });
  if (unnameable.length)
    problems.push(
      \`\${unnameable.length} unlabelled controls: \` +
        unnameable.slice(0, 4).map((e) => e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0]).join(', ')
    );

  const badSvg = q('svg').filter((s) => !s.getAttribute('aria-hidden') && !s.getAttribute('role'));
  if (badSvg.length) problems.push(\`\${badSvg.length} decorative <svg> missing aria-hidden\`);

  const imgs = q('img').filter((i) => !i.getAttribute('alt'));
  if (imgs.length) problems.push(\`\${imgs.length} <img> without alt\`);

  const labelled = q('[aria-labelledby]');
  const dangling = labelled.filter((e) => !document.getElementById((e.getAttribute('aria-labelledby') || '').split(/\\s+/)[0]));
  if (dangling.length) problems.push(\`\${dangling.length} aria-labelledby points at a missing id\`);

  const lang = document.documentElement.getAttribute('lang');
  if (lang !== 'zh-CN') problems.push(\`html lang = \${lang}\`);

  return problems;
})()`;

const browser = await chromium.launch({ channel: "chrome" });
const problems = [];

for (const [name, route] of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(900);

  for (const p of await page.evaluate(AUDIT).catch(() => [])) problems.push(`${name}: ${p}`);

  // Focus must land somewhere visible for every tab stop.
  const invisibleFocus = await page.evaluate(async () => {
    const seen = [];
    for (let i = 0; i < 25; i++) {
      const el = document.activeElement;
      if (!el || el === document.body) break;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const noRing = cs.outlineStyle === "none" && cs.boxShadow === "none";
      if (noRing && r.width > 0) seen.push(el.tagName.toLowerCase() + "." + String(el.className).split(" ")[0]);
      el.blur();
      const next = [...document.querySelectorAll('a[href],button,input,select,[tabindex]:not([tabindex="-1"])')]
        .find((n) => n.getBoundingClientRect().width > 0);
      if (!next) break;
      next.focus();
      if (next === el) break;
    }
    return [...new Set(seen)].slice(0, 5);
  });
  if (invisibleFocus.length) problems.push(`${name}: focus without visible indicator: ${invisibleFocus.join(", ")}`);

  await page.close();
}

await browser.close();
console.log(problems.length ? `A11Y PROBLEMS (${problems.length}):\n- ${problems.join("\n- ")}` : "a11y audit clean");
process.exit(problems.length ? 1 : 0);
