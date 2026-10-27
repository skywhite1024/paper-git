import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { CARD_HEIGHT, CARD_WIDTH, createAtlasLayout, fitBounds, MAX_ZOOM, MIN_ZOOM, routeGeometry, zoomAt } from "../lib/atlas-geometry.ts";

const catalog = JSON.parse(readFileSync(new URL("../content/catalog.json", import.meta.url), "utf8"));
const layout = createAtlasLayout(catalog.tracks);
const frameworks = JSON.parse(readFileSync(new URL("../content/frameworks.json", import.meta.url), "utf8"));
const routes = JSON.parse(readFileSync(new URL("../content/atlas-routes.json", import.meta.url), "utf8"));

test("every paper has an original framework asset, source and structured reading notes", () => {
  assert.deepEqual(Object.keys(frameworks).sort(), catalog.papers.map((paper) => paper.id).sort());
  for (const [id, entry] of Object.entries(frameworks)) {
    assert.ok(statSync(new URL(`../public/figures/${entry.figure.file}`, import.meta.url)).size > 1000, id);
    assert.match(entry.figure.source, /^https:\/\//);
    for (const field of ["inputs", "mechanism", "outputs", "change"]) assert.ok(entry[field].trim(), `${id}: ${field}`);
    assert.equal(entry.steps.length, 3);
  }
});

test("development routes resolve to catalog papers and usable curves", () => {
  const covered = new Set(), pairs = new Set();
  for (const route of routes) {
    const from = layout.points.find((p) => p.id === route.from), to = layout.points.find((p) => p.id === route.to);
    assert.ok(from && to && from !== to);
    assert.ok(["reading", "evolution", "compare"].includes(route.kind));
    assert.ok(!pairs.has(`${route.from}:${route.to}`)); pairs.add(`${route.from}:${route.to}`);
    covered.add(from.id); covered.add(to.id);
    const curve = routeGeometry(from, to, layout.territories.find((a) => a.id === from.track).center);
    assert.doesNotMatch(curve.d, /NaN|Infinity/);
    assert.ok(Number.isFinite(curve.label.x) && Number.isFinite(curve.label.y));
  }
  assert.equal(covered.size, catalog.papers.length);
});

test("every catalog paper occupies one non-overlapping card in its own island", () => {
  assert.deepEqual(layout.points.map((point) => point.id).sort(), catalog.papers.map((paper) => paper.id).sort());
  for (const point of layout.points) {
    const area = layout.territories.find((island) => island.id === point.track);
    assert.equal(catalog.papers.find((paper) => paper.id === point.id).track, point.track);
    assert.ok(point.x >= area.x && point.y >= area.y);
    assert.ok(point.x + CARD_WIDTH <= area.x + area.width && point.y + CARD_HEIGHT <= area.y + area.height, point.id);
    for (const other of layout.points.filter((item) => item.id !== point.id)) {
      const overlaps = point.x < other.x + CARD_WIDTH && point.x + CARD_WIDTH > other.x && point.y < other.y + CARD_HEIGHT && point.y + CARD_HEIGHT > other.y;
      assert.equal(overlaps, false, `${point.id} overlaps ${other.id}`);
    }
  }
});

test("zoom keeps the world point under the cursor fixed, including zoom limits", () => {
  for (const camera of [{ x: -5000, y: 9000, zoom: .8 }, { x: 320, y: -200, zoom: 1.6 }]) {
    for (const requested of [.01, .25, 1, 8]) {
      const anchor = { x: 431, y: 219 };
      const next = zoomAt(camera, requested, anchor);
      assert.ok(next.zoom >= MIN_ZOOM && next.zoom <= MAX_ZOOM);
      assert.ok(Math.abs((anchor.x - camera.x) / camera.zoom - (anchor.x - next.x) / next.zoom) < 1e-8);
      assert.ok(Math.abs((anchor.y - camera.y) / camera.zoom - (anchor.y - next.y) / next.zoom) < 1e-8);
    }
  }
});

test("all islands fit in desktop and phone overview without losing distant papers", () => {
  for (const viewport of [{ width: 1440, height: 760 }, { width: 375, height: 490 }]) {
    const camera = fitBounds(layout.bounds, viewport, 32);
    for (const point of layout.points) {
      assert.ok(point.x * camera.zoom + camera.x >= 0);
      assert.ok(point.y * camera.zoom + camera.y >= 0);
      assert.ok((point.x + CARD_WIDTH) * camera.zoom + camera.x <= viewport.width);
      assert.ok((point.y + CARD_HEIGHT) * camera.zoom + camera.y <= viewport.height);
    }
  }
});
