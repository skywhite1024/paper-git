export type ReadingStatus = "unread" | "reading" | "done";
export type ReadingEntry = { status: ReadingStatus; note: string; updatedAt: string };
export type ReadingEntries = Record<string, ReadingEntry>;
export const STORAGE_KEY = "papergit-reading-v1";
export const statusNames: Record<ReadingStatus, string> = { unread: "待读", reading: "在读", done: "已读" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseReading(text: string, allowedIds: readonly string[]) {
  if (text.length > 5_000_000) throw new Error("备份超过 5 MB，请检查文件是否正确。");
  const data: unknown = JSON.parse(text);
  if (!isRecord(data) || data.version !== 1 || !isRecord(data.entries)) throw new Error("这不是 PaperGit v1 阅读记录备份。");
  const entries: ReadingEntries = {};
  let skipped = 0;
  for (const [id, value] of Object.entries(data.entries)) {
    if (!allowedIds.includes(id)) { skipped++; continue; }
    if (!isRecord(value) || typeof value.status !== "string" || !["unread", "reading", "done"].includes(value.status) ||
      typeof value.note !== "string" || value.note.length > 50000 ||
      typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) {
      throw new Error(`记录 ${id} 格式有误；未导入任何内容。`);
    }
    entries[id] = { status: value.status as ReadingStatus, note: value.note, updatedAt: value.updatedAt };
  }
  return { entries, skipped };
}

export function exportReading(entries: ReadingEntries) {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries }, null, 2);
}

// Keep existing notes on conflicts: importing a backup must not silently replace recent work.
export function mergeReading(current: ReadingEntries, incoming: ReadingEntries) {
  return { ...incoming, ...current };
}
