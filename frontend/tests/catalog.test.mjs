import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const catalog = JSON.parse(readFileSync(new URL("../content/catalog.json", import.meta.url), "utf8"));
const papers = new Map(catalog.papers.map((paper) => [paper.id, paper]));
function safeURL(value) { const url = new URL(value); assert.equal(url.protocol, "https:"); assert.equal(url.username, ""); assert.equal(url.password, ""); }

test("every paper belongs to exactly one stage of the three scoped tracks", () => {
  assert.deepEqual(catalog.tracks.map((track) => track.id), ["world-models", "vla", "robot-agentic"]);
  assert.equal(papers.size, catalog.papers.length);
  const assigned = [];
  for (const track of catalog.tracks) {
    assert.equal(new Set(track.stages.map((stage) => stage.id)).size, track.stages.length);
    for (const stage of track.stages) {
      assert.ok(stage.question && stage.guide && stage.papers.length);
      for (const id of stage.papers) { assert.equal(papers.get(id)?.track, track.id, id); assigned.push(id); }
    }
  }
  assert.equal(assigned.length, papers.size);
  assert.equal(new Set(assigned).size, papers.size);
});

test("curation has provenance, reading limits, and separate preprint/report gates", () => {
  for (const paper of papers.values()) {
    assert.match(paper.id, /^[a-z0-9-]+$/);
    assert.ok(["paper", "report", "preprint"].includes(paper.kind));
    for (const field of ["title", "summary", "why", "watchFor", "reviewScope", "checkedAt"]) assert.ok(paper[field], `${paper.id}.${field}`);
    assert.ok(paper.evidence.length);
    assert.ok(paper.links.length);
    [...paper.evidence, ...paper.links].forEach((source) => safeURL(source.url));
    if (paper.kind === "preprint") {
      assert.equal(paper.year, catalog.frontierYear, paper.id);
      assert.ok(paper.links.some(({ url }) => !new URL(url).hostname.endsWith("arxiv.org")), "preprints need project evidence");
      assert.equal(paper.ccf, null);
    }
    if (paper.kind === "report") { assert.equal(paper.venue, "技术报告"); assert.equal(paper.ccf, null); }
    if (paper.distinction) { assert.equal(paper.kind, "paper"); safeURL(paper.distinction.url); assert.ok(["Oral", "Spotlight", "Best Paper"].includes(paper.distinction.label)); }
    if (["RSS", "CoRL"].includes(paper.venue)) assert.equal(paper.ccf, null);
    if (paper.ccf) assert.equal(paper.ccf, { ICML: "A", ICLR: "A", NeurIPS: "A", CVPR: "A", ICRA: "B" }[paper.venue]);
  }
});

test("cross-track reading and resource references resolve", () => {
  const ids = catalog.tracks.map(({ id }) => id);
  for (const bridge of catalog.bridges) {
    assert.ok(ids.includes(bridge.from) && ids.includes(bridge.to));
    bridge.papers.forEach((id) => assert.ok(papers.has(id), id));
  }
  assert.equal(new Set(catalog.resources.map(({ id }) => id)).size, catalog.resources.length);
  for (const resource of catalog.resources) { safeURL(resource.url); resource.tracks.forEach((id) => assert.ok(ids.includes(id))); }
  assert.equal(catalog.transcripts.length, 8);
  for (const transcript of catalog.transcripts) {
    assert.ok(transcript.filename && transcript.reviewedAt && transcript.takeaway);
    transcript.papers.forEach((id) => assert.ok(papers.has(id), id));
  }
});
