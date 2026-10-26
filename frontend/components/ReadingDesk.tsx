"use client";
import Link from "next/link";
import { useState } from "react";
import { papers } from "@/lib/catalog";
import { statusNames } from "@/lib/reading";
import { useReading } from "./ReadingProvider";

export default function ReadingDesk() {
  const { entries, ready, error, download, importBackup } = useReading();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("all");
  const saved = papers.filter((paper) => entries[paper.id]);
  const visible = saved.filter((paper) => status === "all" || entries[paper.id].status === status).sort((a, b) => entries[b.id].updatedAt.localeCompare(entries[a.id].updatedAt));
  async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("备份超过 5 MB，请检查文件。");
      setMessage(importBackup(await file.text()));
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : "导入失败，已有记录未改变。"); }
    event.target.value = "";
  }
  return <>
    <div className="reading-stats">{Object.entries(statusNames).map(([id, label]) => <div key={id}><strong>{ready ? saved.filter((paper) => entries[paper.id].status === id).length : "—"}</strong><span>{label}</span></div>)}<div><strong>{ready ? saved.filter((paper) => entries[paper.id].note).length : "—"}</strong><span>篇笔记</span></div></div>
    <div className="backup-panel"><div><h2>给阅读留一份备份</h2><p>记录保存在此浏览器。换浏览器或清理网站数据前，请导出；导入时保留已有记录。</p></div><div className="button-row"><button disabled={!ready} className="button" onClick={download}>导出 JSON</button><label className={`button import-button ${!ready ? "disabled" : ""}`}>导入备份<input disabled={!ready} aria-label="导入阅读记录备份" type="file" accept=".json,application/json" onChange={importFile} /></label></div></div>
    {error && <p role="alert" className="warning">{error}</p>}{message && <p role="status" className="notice">{message}</p>}
    <div className="section-heading"><h2>阅读记录</h2><label className="sr-only" htmlFor="reading-filter">筛选阅读记录</label><select id="reading-filter" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">全部记录</option>{Object.entries(statusNames).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></div>
    {!ready ? <p role="status">正在读取本地记录…</p> : visible.length ? <div className="reading-list">{visible.map((paper) => <article className={`reading-row tone-${paper.track}`} key={paper.id}><div><span className={`reading-label ${entries[paper.id].status}`}>{statusNames[entries[paper.id].status]}</span><h3><Link href={`/papers/${paper.id}`}>{paper.name} <span aria-hidden="true">↗</span></Link></h3><p>{entries[paper.id].note || "还没有笔记，打开资料后可以记录你的思考。"}</p></div><time dateTime={entries[paper.id].updatedAt}>{new Date(entries[paper.id].updatedAt).toLocaleDateString("zh-CN")}</time></article>)}</div> : <div className="empty-state"><span className="empty-glyph" aria-hidden="true">✎</span><h2>{saved.length ? "这个状态下还没有记录" : "从一篇感兴趣的论文开始"}</h2><p>在资料详情里标记阅读状态、写下问题，记录就会出现在这里。</p><Link className="button primary" href="/library">去资料库挑选 →</Link></div>}
  </>;
}
