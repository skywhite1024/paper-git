import test from "node:test";
import assert from "node:assert/strict";
import { parseReading, exportReading, mergeReading } from "../lib/reading.ts";

const example = { status: "reading", note: "观察长期预测误差。\n保留公式 x < y & 中文。", updatedAt: "2026-10-26T08:00:00.000Z" };
const allowed = ["dreamer", "openvla"];
test("notes round-trip without changing content or status", () => {
  const entries = { dreamer: example };
  assert.deepEqual(parseReading(exportReading(entries), allowed), { entries, skipped: 0 });
});
test("import keeps existing work and adds nonconflicting records", () => {
  const current = { dreamer: example };
  const imported = { dreamer: { ...example, note: "older backup" }, openvla: { ...example, status: "done" } };
  const merged = mergeReading(current, imported);
  assert.equal(merged.dreamer.note, example.note);
  assert.equal(merged.openvla.status, "done");
  assert.equal(Object.keys(current).length, 1);
});
test("invalid backups and partial invalid imports are rejected atomically", () => {
  for (const data of [null, [], { version: 2, entries: {} }, { version: 1, entries: [] }]) assert.throws(() => parseReading(JSON.stringify(data), allowed));
  for (const patch of [{ status: ["reading"] }, { status: "bogus" }, { note: 3 }, { note: "x".repeat(50001) }, { updatedAt: "not a date" }]) {
    assert.throws(() => parseReading(JSON.stringify({ version: 1, entries: { openvla: example, dreamer: { ...example, ...patch } } }), allowed));
  }
  assert.throws(() => parseReading("x".repeat(5_000_001), allowed));
});
test("unknown IDs and prototype keys are ignored", () => {
  const backup = '{"version":1,"entries":{"__proto__":{"polluted":true},"unlisted":{}}}';
  assert.deepEqual(parseReading(backup, allowed), { entries: {}, skipped: 2 });
  assert.equal({}.polluted, undefined);
});
