"use client";
import { useMemo, useState } from "react";
import { kindNames, papers, tracks } from "@/lib/catalog";
import { statusNames, type ReadingStatus } from "@/lib/reading";
import PaperCard from "./PaperCard";
import { useReading } from "./ReadingProvider";

const routeOrder = new Map(tracks.flatMap((track) => track.stages.flatMap((stage) => stage.papers)).map((id, index) => [id, index]));

export default function Library() {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState("all");
  const [kind, setKind] = useState("all");
  const [honors, setHonors] = useState(false);
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("route");
  const { entries, ready } = useReading();
  const results = useMemo(() => {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const found = papers.filter((paper) => {
      const text = [paper.name, paper.title, paper.summary, paper.venue, paper.year, paper.why].join(" ").toLocaleLowerCase();
      return (track === "all" || paper.track === track) && (kind === "all" || paper.kind === kind) &&
        (!honors || paper.distinction) && words.every((word) => text.includes(word)) &&
        (status === "all" || (entries[paper.id]?.status ?? "unread") === status);
    });
    return found.sort((a, b) => sort === "newest" ? b.year - a.year : routeOrder.get(a.id)! - routeOrder.get(b.id)!);
  }, [query, track, kind, honors, status, sort, entries]);
  function reset() { setQuery(""); setTrack("all"); setKind("all"); setHonors(false); setStatus("all"); setSort("route"); }
  return <>
    <div className="filter-panel">
      <label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="搜索资料" placeholder="搜索论文、方法、会议或年份…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="filter-row"><div className="segmented" aria-label="研究方向"><button aria-pressed={track === "all"} onClick={() => setTrack("all")}>全部方向</button>{tracks.map((item) => <button key={item.id} aria-pressed={track === item.id} onClick={() => setTrack(item.id)}>{item.name}</button>)}</div></div>
      <div className="filter-row">
        <label>资料类型<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="all">全部类型</option>{Object.entries(kindNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>阅读状态<select disabled={!ready} value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">全部状态</option>{Object.entries(statusNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>排列方式<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="route">路线顺序</option><option value="newest">年份从新到旧</option></select></label>
        <label className="check-label"><input type="checkbox" checked={honors} onChange={(event) => setHonors(event.target.checked)} />有 Oral / Spotlight / 获奖记录</label>
      </div>
    </div>
    <div className="section-heading"><p role="status">找到 <strong>{results.length}</strong> 篇资料</p><button className="text-button" onClick={reset}>清除筛选</button></div>
    {results.length ? <div className="paper-grid">{results.map((paper) => <div key={paper.id} className="library-item"><PaperCard paper={paper} />{ready && entries[paper.id] && <span className={`reading-label ${entries[paper.id].status}`}>{statusNames[entries[paper.id].status as ReadingStatus]}{entries[paper.id].note ? " · 有笔记" : ""}</span>}</div>)}</div> : <div className="empty-state"><h2>没有找到匹配的资料</h2><p>试试方法名或缩写，也可以清除筛选重新浏览。</p><button className="button" onClick={reset}>查看全部资料</button></div>}
  </>;
}
