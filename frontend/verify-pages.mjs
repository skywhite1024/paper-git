// Check the exported site with the same sub-path used by GitHub Pages.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, ".next-pages");
const base = process.env.PAGES_BASE_PATH ?? "/paper-git";
const catalog = JSON.parse(readFileSync(join(here, "content/catalog.json"), "utf8"));
const routes = ["", "library", "reading", "sources", ...catalog.papers.map(({ id }) => `papers/${id}`), ...catalog.tracks.map(({ id }) => `tracks/${id}`)];
for (const route of routes) assert.ok(existsSync(join(out, route, "index.html")), `Missing exported route: ${route}`);
assert.ok(existsSync(join(out, "404.html")), "Missing 404 page");
assert.ok(existsSync(join(out, ".nojekyll")), "Missing .nojekyll");

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? htmlFiles(join(dir, entry.name)) : entry.name.endsWith(".html") ? [join(dir, entry.name)] : []);
}
let checked = 0;
for (const file of htmlFiles(out)) {
  const html = readFileSync(file, "utf8");
  for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (!raw.startsWith("/") || raw.startsWith("//")) continue;
    const path = decodeURIComponent(raw.split(/[?#]/)[0]);
    assert.ok(path === base || path.startsWith(`${base}/`), `Link escapes Pages base path in ${file}: ${raw}`);
    const target = join(out, path.slice(base.length));
    assert.ok(existsSync(target), `Missing exported asset or link target: ${raw}`);
    if (statSync(target).isDirectory()) assert.ok(existsSync(join(target, "index.html")), `No index for ${raw}`);
    checked++;
  }
}
console.log(`Pages export verified: ${routes.length} routes, 404 page, ${checked} internal links/assets under ${base || "/"}.`);
