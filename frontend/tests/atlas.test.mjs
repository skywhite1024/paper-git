import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { CARD_HEIGHT, CARD_WIDTH, createAtlasLayout, figureTier, fitBounds, intersects, MAX_ZOOM, MIN_ZOOM, routeGeometry, viewportBounds, zoomAt } from "../lib/atlas-geometry.ts";

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
    assert.ok(route.explanation?.trim(), `${route.from} → ${route.to}: missing endpoint explanation`);
    assert.match(route.source, /^https:\/\//);
    assert.ok(!pairs.has(`${route.from}:${route.to}`)); pairs.add(`${route.from}:${route.to}`);
    covered.add(from.id); covered.add(to.id);
    const curve = routeGeometry(from, to, layout.territories.find((a) => a.id === from.track).center);
    assert.doesNotMatch(curve.d, /NaN|Infinity/);
    assert.ok(Number.isFinite(curve.label.x) && Number.isFinite(curve.label.y));
  }
  assert.equal(covered.size, catalog.papers.length);
  for (const track of catalog.tracks) for (const stage of track.stages) {
    for (let i = 1; i < stage.papers.length; i++) assert.ok(pairs.has(`${stage.papers[i - 1]}:${stage.papers[i]}`), `missing route to ${stage.papers[i]}`);
  }
});

test("branches grow beyond three rings without dropping or overlapping papers", () => {
  for (const count of [20, 21, 27, 28, 35, 36]) {
    const expanded = structuredClone(catalog.tracks);
    expanded[0].stages[0].papers = Array.from({ length: count }, (_, i) => `future-${i}`);
    const result = createAtlasLayout(expanded);
    assert.equal(result.points.filter((p) => p.stage === expanded[0].stages[0].id).length, count);
    for (let i = 0; i < result.points.length; i++) for (const b of result.points.slice(i + 1)) {
      const a = result.points[i];
      assert.equal(intersects({ ...a, width: CARD_WIDTH, height: CARD_HEIGHT }, { ...b, width: CARD_WIDTH, height: CARD_HEIGHT }), false, `${a.id} / ${b.id}`);
    }
  }
});

test("viewport culling includes partially visible cards and an overscan margin at every zoom", () => {
  const size = { width: 1280, height: 720 };
  for (const zoom of [MIN_ZOOM, .62, MAX_ZOOM]) {
    const camera = { x: -1234, y: 567, zoom };
    const visible = viewportBounds(camera, size, 0), padded = viewportBounds(camera, size);
    const onEdge = { x: visible.x - CARD_WIDTH + 1, y: visible.y, width: CARD_WIDTH, height: CARD_HEIGHT };
    assert.ok(intersects(visible, onEdge));
    assert.ok(intersects(padded, { ...onEdge, x: visible.x - CARD_WIDTH - 200 / zoom }));
    assert.equal(intersects(padded, { ...onEdge, x: visible.x - CARD_WIDTH - 300 / zoom }), false);
    for (const p of layout.points) {
      const screenVisible = p.x * zoom + camera.x < size.width && (p.x + CARD_WIDTH) * zoom + camera.x > 0 && p.y * zoom + camera.y < size.height && (p.y + CARD_HEIGHT) * zoom + camera.y > 0;
      if (screenVisible) assert.ok(intersects(padded, { ...p, width: CARD_WIDTH, height: CARD_HEIGHT }), p.id);
    }
  }
});

test("every paper has a small canvas preview, while its original stays available", () => {
  let bytes = 0;
  for (const id of Object.keys(frameworks)) {
    const size = statSync(new URL(`../public/figures/previews/${id}.webp`, import.meta.url)).size;
    assert.ok(size > 1000 && size < 120_000, id);
    bytes += size;
  }
  assert.ok(bytes < Object.keys(frameworks).length * 40_000, `preview total: ${bytes}`);
});

test("overview uses a separate small image tier before readers request detail", () => {
  assert.equal(figureTier(.02), "overview");
  assert.equal(figureTier(.32), "overview");
  assert.equal(figureTier(.62), "preview");
  assert.equal(figureTier(1.1), "preview");
  assert.equal(figureTier(1.11), "original");
  let bytes = 0;
  for (const id of Object.keys(frameworks)) {
    const size = statSync(new URL(`../public/figures/overview/${id}.webp`, import.meta.url)).size;
    assert.ok(size > 200 && size < 20_000, id);
    bytes += size;
  }
  assert.ok(bytes < Object.keys(frameworks).length * 8000, `overview total: ${bytes}`);
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
