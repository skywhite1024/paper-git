"use client";
import { useEffect, useState } from "react";
import { statusNames, type ReadingStatus } from "@/lib/reading";
import { useReading } from "./ReadingProvider";

export default function ReadingEditor({ id }: { id: string }) {
  const { entries, ready, error, update } = useReading();
  const entry = entries[id];
  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { if (!dirty) setNote(entry?.note ?? ""); }, [entry?.note, dirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function save() { if (update(id, { note })) { setDirty(false); setMessage("笔记已保存到当前浏览器。"); } }
  return <section className="note-panel" aria-labelledby="notes-title">
    <div className="section-heading"><h2 id="notes-title">我的阅读笔记</h2><span className="eyebrow">LOCAL NOTES</span></div>
    <label className="status-select">阅读状态<select aria-label="阅读状态" disabled={!ready} value={entry?.status ?? "unread"} onChange={(event) => update(id, { status: event.target.value as ReadingStatus })}>{Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="note-label" htmlFor="paper-note">记录理解、疑问和下一步实验</label>
    <textarea id="paper-note" maxLength={50000} disabled={!ready} value={note} onBlur={() => { if (dirty) save(); }} onChange={(event) => { setNote(event.target.value); setDirty(true); setMessage(""); }} placeholder="核心问题是什么？关键假设有哪些？哪些实验值得复现？" />
    <div className="note-actions"><button className="button primary" disabled={!ready || !dirty} onClick={save}>保存笔记</button><span role="status">{dirty ? "有未保存内容" : message || (entry?.updatedAt ? "已载入本地记录" : "笔记仅保存在当前浏览器")}</span></div>
    {error && <p role="alert" className="warning">{error}</p>}
  </section>;
}
