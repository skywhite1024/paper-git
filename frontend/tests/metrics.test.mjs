import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const catalog = JSON.parse(readFileSync(new URL("../content/catalog.json", import.meta.url), "utf8"));
const snapshot = JSON.parse(readFileSync(new URL("../content/paper-metrics.json", import.meta.url), "utf8"));

test("every paper has an explicit metric status, provenance and nullable counts", () => {
  assert.deepEqual(Object.keys(snapshot.papers).sort(), catalog.papers.map(({ id }) => id).sort());
  assert.match(snapshot.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(snapshot.citationProvider, "Semantic Scholar");
  for (const [id, { github, citations }] of Object.entries(snapshot.papers)) {
    for (const value of [github.stars, citations.count]) assert.ok(value === null || (Number.isSafeInteger(value) && value >= 0), id);
    assert.match(github.evidence, /^https:\/\//, id);
    assert.ok(github.note && citations.note, id);
    if (["open", "public"].includes(github.status)) {
      assert.match(github.url, /^https:\/\/github.com\//, id);
      assert.ok(github.repo && github.stars !== null, id);
      if (github.status === "open") assert.ok(github.license && github.license !== "NOASSERTION", id);
    } else {
      assert.ok(["unconfirmed", "unavailable"].includes(github.status), id);
      assert.equal(github.stars, null, id);
    }
    if (citations.count !== null) {
      assert.match(citations.paperId, /^[a-f0-9]{40}$/, id);
      assert.equal(citations.lookupId, citations.paperId, id);
      assert.equal(citations.url, `https://www.semanticscholar.org/paper/${citations.paperId}`, id);
      assert.ok(citations.title && citations.basis, id);
    } else assert.equal(citations.paperId, null, id);
  }
});

test("shared repositories use one total and selected citation versions stay separate", () => {
  const byRepo = new Map();
  for (const { github } of Object.values(snapshot.papers)) if (github.repo) {
    if (byRepo.has(github.repo)) {
      const other = byRepo.get(github.repo);
      assert.equal(github.stars, other.stars);
      assert.ok(github.shared && other.shared, github.repo);
    }
    byRepo.set(github.repo, github);
  }
  assert.equal(snapshot.papers["behavior-1k"].citations.paperId, "69764fcc646e4c608ac08eeb4c784cf8465268d2", "use the curated CoRL 2022 paper, not its 2024 extension");
  assert.equal(snapshot.papers.dreamerv3.citations.paperId, "32720f16a4433ac6bb33a0f7d32bffb3cdda053e", "use the Nature record without adding arXiv citations");
  assert.match(snapshot.papers.openeqa.citations.title, /^OpenEQA:/, "exclude unrelated arXiv IDs");
});
