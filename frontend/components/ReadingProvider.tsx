"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { papers } from "@/lib/catalog";
import { STORAGE_KEY, exportReading, mergeReading, parseReading, type ReadingEntries, type ReadingEntry } from "@/lib/reading";

const ids = papers.map((paper) => paper.id);
type ReadingContextValue = {
  entries: ReadingEntries; ready: boolean; error: string;
  update: (id: string, value: Partial<ReadingEntry>) => boolean;
  importBackup: (text: string) => string;
  download: () => void;
};
const ReadingContext = createContext<ReadingContextValue | null>(null);

export default function ReadingProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<ReadingEntries>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const read = () => {
      try {
        const text = localStorage.getItem(STORAGE_KEY);
        setEntries(text ? parseReading(text, ids).entries : {});
        setError("");
      } catch { setError("无法读取本地记录。原始内容已保留，请先导出备份；当前修改无法保存。"); }
      setReady(true);
    };
    read();
    const sync = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) read(); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const save = useCallback((change: (current: ReadingEntries) => ReadingEntries) => {
    if (!ready) throw new Error("本地记录尚未加载，请稍后再试。");
    const raw = localStorage.getItem(STORAGE_KEY);
    const current = raw ? parseReading(raw, ids).entries : {};
    const result = change(current);
    localStorage.setItem(STORAGE_KEY, exportReading(result));
    setEntries(result);
    setError("");
  }, [ready]);
  const update = (id: string, value: Partial<ReadingEntry>) => {
    try {
      if (!ids.includes(id)) throw new Error("未收录的论文。");
      save((current) => ({ ...current, [id]: { ...(current[id] ?? { status: "unread" as const, note: "" }), ...value, updatedAt: new Date().toISOString() } }));
      return true;
    } catch { setError("本次修改未保存：浏览器存储可能已满、被禁用或记录格式异常。请保留笔记文本并导出备份。"); return false; }
  };
  const importBackup = (text: string) => {
    const parsed = parseReading(text, ids);
    let added = 0;
    save((current) => {
      added = Object.keys(parsed.entries).filter((id) => !current[id]).length;
      return mergeReading(current, parsed.entries);
    });
    return `已导入 ${added} 条记录，保留已有记录；忽略 ${parsed.skipped} 条未收录资料。`;
  };
  const download = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? exportReading(entries);
      const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `papergit-reading-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError("无法导出浏览器存储，请检查此浏览器的存储权限。"); }
  };
  return <ReadingContext.Provider value={{ entries, ready, error, update, importBackup, download }}>{children}</ReadingContext.Provider>;
}

export function useReading() {
  const value = useContext(ReadingContext);
  if (!value) throw new Error("ReadingProvider is required");
  return value;
}
