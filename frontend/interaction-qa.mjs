// Interaction smoke test: proves the app works, not just looks right.
// Usage: node interaction-qa.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const results = [];

function check(name, fn) {
  return fn().then(
    () => {
      results.push(["PASS", name]);
      console.log(`PASS  ${name}`);
    },
    (e) => {
      results.push(["FAIL", name, String(e.message).slice(0, 160)]);
      console.log(`FAIL  ${name}  <- ${String(e.message).slice(0, 160)}`);
    }
  );
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const browser = await chromium.launch({ channel: "chrome" });

/* --------------------------------------------------------------- desktop */
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => results.push(["FAIL", "unexpected pageerror", e.message.slice(0, 160)]));

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForSelector("canvas", { timeout: 20000 });

await check("theme toggle switches and persists", async () => {
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.click(`button[aria-label="${before === "dark" ? "切换为浅色主题" : "切换为深色主题"}"]`);
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  assert(before !== after, `data-theme unchanged (${before})`);
  await page.reload({ waitUntil: "networkidle" });
  const kept = await page.evaluate(() => document.documentElement.dataset.theme);
  assert(kept === after, `not persisted after reload (${kept})`);
  await page.click(`button[aria-label="${after === "dark" ? "切换为浅色主题" : "切换为深色主题"}"]`);
});

await check("global search suggests and navigates", async () => {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("#pg-search");
  await page.type("#pg-search", "Diffusion", { delay: 30 });
  await page.waitForSelector('[role="listbox"] [role="option"]', { timeout: 10000 });
  const n = await page.locator('[role="listbox"] [role="option"]').count();
  assert(n > 0, "no suggestion rows");
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => !/^https?:\/\/localhost:3000\/?$/.test(u.href), { timeout: 8000 });
});

await check("Ctrl+K focuses the search field", async () => {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  // networkidle does not imply React finished hydrating, so the keydown listener may
  // not be attached yet; retry until focus moves rather than sleeping a fixed amount.
  let focused = "";
  for (let i = 0; i < 20 && focused !== "pg-search"; i++) {
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(150);
    focused = await page.evaluate(() => document.activeElement?.id ?? "");
  }
  assert(focused === "pg-search", `focus was on "${focused}"`);
});

await check("topology finder selects a node into the HUD", async () => {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const sel = page.locator('select[aria-label="定位节点"]');
  await sel.waitFor({ timeout: 10000 });
  const opts = await sel.locator("option").evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
  assert(opts.length > 5, `finder has ${opts.length} options`);
  await sel.selectOption(opts[Math.floor(opts.length / 2)]);
  const hud = await page.locator("aside").first().innerText();
  assert(hud.length > 40, "HUD did not populate");
});

await check("list view replaces the 3D scene and restores", async () => {
  const group = page.locator('[role="group"][aria-label]');
  await group.locator("button", { hasText: "列表" }).first().click();
  await page.waitForTimeout(600);
  assert((await page.locator("canvas").count()) === 0, "canvas still mounted in list view");
  await group.locator("button", { hasText: "三维" }).first().click();
  await page.waitForSelector("canvas", { timeout: 15000 });
});

await check("node tabs drive URL state", async () => {
  await page.goto(`${BASE}/nodes/ai`, { waitUntil: "networkidle" });
  await page.click('[role="tab"]:has-text("论文列表")');
  await page.waitForURL(/tab=papers/, { timeout: 8000 });
  await page.waitForSelector("article, [data-paper-card]", { timeout: 8000 });
});

await check("year filter narrows the result count", async () => {
  const total = async () =>
    (await page.locator("main").innerText()).match(/共\s*([\d,]+)\s*篇/)?.[1] ?? "";
  const before = await total();
  // Target the year control by its options, not by position: the page gains more
  // selects (scope, per-page) as it evolves and a positional locator would drift.
  const yearIdx = await page.evaluate(() =>
    [...document.querySelectorAll("select")].findIndex((s) =>
      [...s.options].some((o) => /^\d{4}$/.test(o.value))
    )
  );
  assert(yearIdx >= 0, "no year select found");
  const yearSelect = page.locator("select").nth(yearIdx);
  const years = await yearSelect
    .locator("option")
    .evaluateAll((os) => os.map((o) => o.value).filter((v) => /^\d{4}$/.test(v)));
  assert(years.length > 0, "no year options");
  await yearSelect.selectOption(years[0]);
  await page.click("button:has-text('应用筛选')");
  await page.waitForURL(/year=/, { timeout: 8000 });
  const after = await total();
  assert(after && after !== before, `count did not change (${before} -> ${after})`);
});

await check("pagination advances a page", async () => {
  await page.goto(`${BASE}/nodes/ai?tab=papers`, { waitUntil: "networkidle" });
  await page.click("a:has-text('下一页'), button:has-text('下一页')");
  await page.waitForURL(/page=2/, { timeout: 8000 });
});

await check("watch then unwatch with undo", async () => {
  // Start from a clean slate so the check is repeatable.
  await page.request.delete(`${API}/api/watch/cs`).catch(() => {});
  await page.goto(`${BASE}/nodes/cs`, { waitUntil: "networkidle" });
  await page.locator('button[aria-label^="关注「"]').click();
  await page.waitForSelector('button[aria-label^="取消关注「"], button:has-text("已关注")', { timeout: 6000 });
  await page.goto(`${BASE}/watchlist`, { waitUntil: "networkidle" });
  const body = await page.locator("main").innerText();
  assert(/计算机科学/.test(body), "watched node missing from digest");
  await page.locator("button:has-text('取消关注')").first().click();
  await page.waitForTimeout(600);
  assert(/撤销/.test(await page.locator("body").innerText()), "no undo affordance after unwatch");
  const undo = page.locator("button:has-text('撤销')").first();
  if (await undo.count()) {
    await undo.click();
    await page.waitForTimeout(800);
    await page.reload({ waitUntil: "networkidle" });
    assert(/计算机科学/.test(await page.locator("main").innerText()), "undo did not restore the watch");
    await page.locator("button:has-text('取消关注')").first().click();
  }
});

await check("deep link focuses a topology node", async () => {
  await page.goto(`${BASE}/?route=usd`, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 10000 });
  const active = await page.locator('[aria-pressed="true"]').first().innerText();
  assert(active.length > 0, "no active filter chip");
});

await check("unknown route returns HTTP 404 with recovery UI", async () => {
  const res = await page.goto(`${BASE}/definitely-not-a-page`);
  assert(res?.status() === 404, `status ${res?.status()}`);
  assert(/未找到/.test(await page.locator("main").innerText()), "no not-found copy");
});

await check("missing node renders the recovery view", async () => {
  // The node segment has a route-level loading.tsx, so Next streams the shell and
  // the status is 200 even though notFound() fires; assert the rendered outcome.
  await page.goto(`${BASE}/nodes/__definitely_missing__`);
  await page.getByText("未找到对应内容").waitFor({ timeout: 10000 });
});

await ctx.close();

/* ---------------------------------------------------------------- mobile */
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const m = await mctx.newPage();

await check("mobile drawer opens, navigates and closes", async () => {
  await m.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const burger = m.locator('button[aria-label="展开导航菜单"]');
  assert((await burger.count()) === 1, "hamburger not rendered at 390px");
  await burger.click();
  const drawer = m.locator('nav[aria-label="移动端导航"]:visible');
  await drawer.waitFor({ timeout: 5000 });
  await drawer.locator('a:has-text("技术路线")').click();
  await m.waitForURL(/\/routes/, { timeout: 8000 });
  const open = await m.locator('button[aria-label="展开导航菜单"]').getAttribute("aria-expanded");
  assert(open === "false", `drawer still open (${open})`);
});

await check("mobile topology stays usable", async () => {
  await m.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await m.waitForSelector("canvas", { timeout: 15000 });
  const box = await m.locator("canvas").boundingBox();
  assert(box.width > 300 && box.height > 300, `canvas too small ${box?.width}x${box?.height}`);
});

await mctx.close();
await browser.close();

const failed = results.filter((r) => r[0] === "FAIL");
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("FAILURES:\n- " + failed.map((f) => `${f[1]} :: ${f[2] ?? ""}`).join("\n- "));
  process.exit(1);
}
