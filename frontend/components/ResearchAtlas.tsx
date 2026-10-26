"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { getPaper, getTrack, papers, type Paper } from "@/lib/catalog";
import { assetPath, frameworks, islands, landmarks, matchPaper, orderedPapers, relations } from "@/lib/atlas";
import { statusNames, type ReadingStatus } from "@/lib/reading";
import { useReading } from "./ReadingProvider";
import FrameworkFigure from "./FrameworkFigure";
import ReadingEditor from "./ReadingEditor";

type ReaderTab = "overview" | "compare" | "notes";
const tabs: { id: ReaderTab; name: string }[] = [{ id: "overview", name: "论文导读" }, { id: "compare", name: "方法对照" }, { id: "notes", name: "阅读笔记" }];

function Terrain() {
  return <svg viewBox="0 0 1000 900" className="atlas-terrain" aria-hidden="true">
    <defs>
      {islands.map((island) => <radialGradient key={island.id} id={`wash-${island.id}`}><stop offset="0" stopColor={island.color} stopOpacity=".16" /><stop offset=".82" stopColor={island.color} stopOpacity=".1" /><stop offset="1" stopColor={island.color} stopOpacity=".025" /></radialGradient>)}
      <pattern id="atlas-grain" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".5" fill="#9d927c" opacity=".14" /></pattern>
      <symbol id="atlas-tree" viewBox="0 0 24 38"><path d="M12 2C7 6 4 12 7 16C0 22 4 29 11 29L11 36M12 9L12 36M13 2C18 8 21 13 17 17C24 23 19 30 13 29" fill="#a5b49b" fillOpacity=".16" stroke="#8a9d7f" strokeOpacity=".42" strokeWidth="1" /></symbol>
      <symbol id="atlas-mountain" viewBox="0 0 50 32"><path d="M1 30L19 3L35 30M20 30L35 11L49 30M13 13L19 16L24 12" fill="none" stroke="#adab92" strokeOpacity=".4" strokeWidth="1" /></symbol>
    </defs>
    <rect width="1000" height="900" fill="url(#atlas-grain)" />
    {islands.map((island) => <g key={island.id}>
      {[1.14, 1.1, 1.06, 1.025].map((scale, i) => <path key={scale} d={island.path} fill="none" stroke={island.color} strokeWidth=".7" opacity={.08 + i * .025} transform={`translate(${island.x} ${island.y + 180}) scale(${scale}) translate(${-island.x} ${-island.y - 180})`} />)}
      <path d={island.path} fill={`url(#wash-${island.id})`} stroke={island.color} strokeOpacity=".19" strokeWidth="1" />
      {[.92, .82, .69].map((scale) => <path key={scale} d={island.path} fill="none" stroke={island.color} strokeWidth=".7" opacity=".1" transform={`translate(${island.x} ${island.y + 180}) scale(${scale}) translate(${-island.x} ${-island.y - 180})`} />)}
    </g>)}
    {[[73, 234], [118, 171], [348, 148], [472, 333], [104, 422], [171, 480], [373, 491], [904, 223], [937, 420], [859, 544], [622, 201], [100, 687], [154, 814], [330, 839], [662, 780], [511, 586], [55, 543]].map(([x, y], i) => <use key={i} href="#atlas-tree" x={x} y={y} width="20" height="33" />)}
    <use href="#atlas-mountain" x="846" y="61" width="65" height="39" /><use href="#atlas-mountain" x="70" y="75" width="42" height="27" />
    <path d="M458 500C500 487 516 518 548 503M449 510C490 500 518 530 547 518M777 692C812 675 850 690 871 671M780 705C821 687 852 702 880 683" fill="none" stroke="#9eaaa3" strokeWidth="1" opacity=".26" />
  </svg>;
}

function ComparePapers({ paper, onSelect }: { paper: Paper; onSelect: (id: string) => void }) {
  const related = relations.find((edge) => edge.from === paper.id || edge.to === paper.id);
  const [otherId, setOtherId] = useState(related ? (related.from === paper.id ? related.to : related.from) : paper.id === "dreamer" ? "openvla" : "dreamer");
  const other = getPaper(otherId)!;
  const columns = [paper, other];
  return <div className="atlas-comparison"><label>与另一篇论文对照<select aria-label="与另一篇论文对照" value={otherId} onChange={(event) => setOtherId(event.target.value)}>{orderedPapers.filter((item) => item.id !== paper.id).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.year}</option>)}</select></label>
    <div className="atlas-compare-head">{columns.map((item) => <div key={item.id}><small>{getTrack(item.track)?.name}</small><h3>{item.name}</h3><span>{item.venue} · {item.year}</span></div>)}</div>
    <table><caption className="sr-only">{paper.name} 与 {other.name} 的方法对照</caption><thead><tr><th>维度</th>{columns.map((item) => <th key={item.id}>{item.name}</th>)}</tr></thead><tbody>{([['输入', 'inputs'], ['机制', 'mechanism'], ['输出', 'outputs']] as const).map(([label, field]) => <tr key={field}><th scope="row">{label}</th>{columns.map((item) => <td key={item.id}>{frameworks[item.id]?.[field] ?? "结构化解读待补充，请参阅原文"}</td>)}</tr>)}<tr><th scope="row">核心问题</th>{columns.map((item) => <td key={item.id}>{item.summary}</td>)}</tr><tr><th scope="row">阅读边界</th>{columns.map((item) => <td key={item.id}>{item.watchFor}</td>)}</tr></tbody></table>
    <div className="atlas-compare-figures">{columns.map((item) => <div key={item.id}><h4>{item.name} · 关键框架</h4><FrameworkFigure key={item.id} paper={item} /></div>)}</div>
    <button className="button" onClick={() => onSelect(other.id)}>在地图中查看 {other.name} ↗</button>
  </div>;
}

export default function ResearchAtlas() {
  const [selectedId, setSelectedId] = useState("dreamer");
  const [scope, setScope] = useState("all");
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [tab, setTab] = useState<ReaderTab>("overview");
  const [zoom, setZoom] = useState(1);
  const [showRelations, setShowRelations] = useState(true);
  const [indexOpen, setIndexOpen] = useState(false);
  const mapViewport = useRef<HTMLDivElement>(null);
  const reader = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const { entries, ready, update, error } = useReading();
  const paper = getPaper(selectedId)!;
  const framework = frameworks[paper.id];
  const track = getTrack(paper.track)!;
  const stage = track.stages.find((item) => item.papers.includes(paper.id))!;
  const filtered = orderedPapers.filter((item) => (scope === "all" || item.track === scope) && (year === "all" || String(item.year) === year) && matchPaper(item, query));
  const filteredIds = new Set(filtered.map((item) => item.id));
  const hasFilters = scope !== "all" || year !== "all" || query.trim() !== "";
  const activeEdges = relations.filter((edge) => edge.from === selectedId || edge.to === selectedId);
  // A selected index entry takes one landmark slot, so all papers remain reachable without overcrowding the map.
  const points = landmarks.map((point) => point.id === (paper.track === "world-models" ? "dreamer" : paper.track === "vla" ? "openvla" : "voxposer") && !landmarks.some((item) => item.id === selectedId) ? { ...point, id: selectedId } : point);
  const visiblePoints = points.filter((point) => filteredIds.has(point.id));
  const visibleEdges = showRelations ? relations.filter((edge) => visiblePoints.some((point) => point.id === edge.from) && visiblePoints.some((point) => point.id === edge.to)) : [];
  const years = [...new Set(papers.map((item) => item.year))].sort((a, b) => b - a);

  function selectPaper(id: string) {
    const next = getPaper(id)!;
    if (!filteredIds.has(next.id)) resetFilters();
    setSelectedId(id); setTab("overview");
    reader.current?.scrollTo({ top: 0 });
    if (window.matchMedia("(max-width: 1180px)").matches) requestAnimationFrame(() => reader.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }));
  }
  function resetFilters() { setScope("all"); setYear("all"); setQuery(""); }
  function zoomMap(value: number) {
    setZoom(Math.max(1, Math.min(1.8, Math.round(value * 10) / 10)));
    if (value <= 1) mapViewport.current?.scrollTo({ top: 0, left: 0 });
  }
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (zoom === 1 || event.button !== 0 || (event.target as Element).closest("button")) return;
    const viewport = mapViewport.current!;
    drag.current = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || !mapViewport.current) return;
    mapViewport.current.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
    mapViewport.current.scrollTop = drag.current.top - (event.clientY - drag.current.y);
  }

  return <div className="research-atlas">
    <header className="atlas-heading"><div><p className="eyebrow">AN ATLAS OF EMBODIED INTELLIGENCE</p><h1>研究群岛<span>让论文之间的联系，浮出水面。</span></h1><p>从世界模型到具身智能，沿着问题探索方法，循着框架理解论文。</p></div><div className="atlas-collection"><strong>{papers.length}</strong><span>篇精选研究<br /><b>3</b> 座知识群岛</span></div></header>
    <div className="atlas-toolbar"><label className="atlas-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><input aria-label="搜索群岛中的论文" placeholder="搜索论文、方法或研究问题…" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button onClick={() => setQuery("")} aria-label="清空搜索">×</button>}</label><div className="atlas-scope" aria-label="研究方向"><button aria-pressed={scope === "all"} onClick={() => setScope("all")}>全部群岛</button>{islands.map((island) => <button key={island.id} style={{ "--island": island.color } as CSSProperties} aria-pressed={scope === island.id} onClick={() => setScope(island.id)}><i />{island.id === "world-models" ? "世界模型" : island.id === "vla" ? "VLA" : "Agent"}</button>)}</div><label className="atlas-year"><span className="sr-only">发表年份</span><select aria-label="发表年份" value={year} onChange={(event) => setYear(event.target.value)}><option value="all">全部年份</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>
    <div className="atlas-workbench"><section className="atlas-map-column" aria-label="研究群岛地图">
      <div className="atlas-map-top"><span><i />交互地图 <b>·</b> 点击论文，展开框架与导读</span><button aria-pressed={showRelations} onClick={() => setShowRelations(!showRelations)}>{showRelations ? "隐藏" : "显示"}联系</button></div>
      <div className={`atlas-map-viewport ${zoom > 1 ? "zoomed" : ""}`} ref={mapViewport} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <div className="atlas-map-sheet" style={{ width: `${zoom * 100}%`, minWidth: `${zoom * 600}px` }}><Terrain />
          <svg viewBox="0 0 1000 900" className="atlas-connections" aria-hidden="true"><defs><marker id="atlas-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="none" stroke="context-stroke" strokeWidth="1.2" /></marker></defs>{visibleEdges.map((edge) => {
            const from = points.find((point) => point.id === edge.from)!; const to = points.find((point) => point.id === edge.to)!;
            const active = edge.from === selectedId || edge.to === selectedId;
            const midX = (from.x + to.x) / 2; const midY = (from.y + to.y) / 2;
            const label = edge.labelPosition ?? { x: midX, y: midY + 19 };
            return <g key={`${edge.from}-${edge.to}`} className={`${edge.kind} ${active ? "active" : ""}`}><path d={`M${from.x} ${from.y + 37} Q${midX + (edge.kind === "compare" ? 35 : -22)} ${midY + 45} ${to.x} ${to.y - 36}`} markerEnd={edge.kind === "reading" ? "url(#atlas-arrow)" : undefined} />{active && <g className="atlas-edge-label"><rect x={label.x - 110} y={label.y - 16} width="220" height="30" rx="7" /><text x={label.x} y={label.y + 5} textAnchor="middle">{edge.label}</text></g>}</g>;
          })}</svg>
          {islands.map((island) => <button key={island.id} className={`atlas-island-title ${scope !== "all" && scope !== island.id ? "muted" : ""}`} style={{ left: `${island.x / 10}%`, top: `${island.y / 9}%`, "--island": island.color } as CSSProperties} onClick={() => { setScope(scope === island.id ? "all" : island.id); setIndexOpen(true); }} aria-label={`浏览${island.name}全部论文`}><span>{island.english}</span><strong>{island.name}</strong><small>{island.question}</small></button>)}
          {visiblePoints.map((point) => { const item = getPaper(point.id)!; const itemFigure = frameworks[item.id]?.figure; const color = islands.find((island) => island.id === item.track)!.color; return <button key={point.id} className={`atlas-pin ${selectedId === point.id ? "selected" : ""}`} style={{ left: `${point.x / 10}%`, top: `${point.y / 9}%`, "--island": color } as CSSProperties} aria-pressed={selectedId === point.id} aria-label={`查看 ${item.name}，${item.year}`} onClick={() => selectPaper(point.id)}>{itemFigure ? <img src={assetPath(`/figures/${itemFigure.file}`)} alt="" draggable="false" /> : <span className="atlas-pin-monogram" aria-hidden="true">{item.name.slice(0, 1)}</span>}<span className="atlas-pin-name"><strong>{item.name}</strong><small>{item.year} <span>{entries[item.id]?.status === "done" ? "· 已读" : ""}</span></small></span><i className="atlas-pin-dot" /></button>; })}
          {hasFilters && visiblePoints.length === 0 && <div className="atlas-map-message"><strong>{filtered.length ? "这个方向还有更多值得读的论文" : "没有找到匹配的论文"}</strong><p>{filtered.length ? "从下方结果选择一篇，它会出现在所属群岛。" : "试试方法名、缩写，或清除筛选。"}</p>{!filtered.length && <button onClick={resetFilters}>清除筛选</button>}</div>}
          <span className="atlas-map-coordinate">PAPERGIT FIELD NOTES<br />EST. 2018 — 2026</span>
        </div>
      </div>
      <div className="atlas-map-bottom"><div className="atlas-legend"><span><i className="selected" />当前论文</span><span><i className="line" />建议阅读</span><span><i className="line dashed" />方法对照</span></div><div className="atlas-zoom"><button aria-label="缩小地图" disabled={zoom === 1} onClick={() => zoomMap(zoom - .2)}>−</button><button className="atlas-zoom-reset" aria-label="重置地图视角" onClick={() => zoomMap(1)}>{Math.round(zoom * 100)}%</button><button aria-label="放大地图" disabled={zoom === 1.8} onClick={() => zoomMap(zoom + .2)}>＋</button></div></div>
      <div className="atlas-map-note">连线用于解释阅读路径与方法差异，不代表已核验的引用关系。</div>
      <details className="atlas-index" open={indexOpen || hasFilters} onToggle={(event) => { if (!hasFilters) setIndexOpen(event.currentTarget.open); }}><summary><span>探索全部论文 <b>{filtered.length}</b></span><span>{hasFilters ? "筛选结果" : "按群岛展开"} ↓</span></summary><div className="atlas-index-content"><p role="status">{hasFilters ? `找到 ${filtered.length} 篇资料` : `地图展示 9 篇地标论文，全部 ${papers.length} 篇均可在此选择。`}</p>{hasFilters && <button className="text-button" onClick={resetFilters}>清除筛选</button>}{islands.map((island) => { const items = filtered.filter((item) => item.track === island.id); return items.length > 0 && <div className="atlas-index-group" key={island.id}><h3 style={{ color: island.color }}>{island.name} <span>{items.length}</span></h3><div>{items.map((item) => <button key={item.id} aria-pressed={selectedId === item.id} onClick={() => selectPaper(item.id)}><span>{item.name}</span><small>{item.year}</small></button>)}</div></div>; })}{!filtered.length && <p>没有匹配项，清除筛选后重新探索。</p>}</div></details>
    </section>
    <aside className="atlas-reader" aria-label="当前论文解读" ref={reader}>
      <div className="atlas-reader-identity"><div className="atlas-reader-kicker"><span style={{ color: islands.find((island) => island.id === paper.track)!.color }}>{track.name}</span><Link href={`/papers/${paper.id}`} aria-label={`打开 ${paper.name} 详情`}>↗</Link></div><div className="atlas-reader-title"><h2>{paper.name}</h2><span>{paper.year}</span></div><p>{paper.title}</p><div className="atlas-reader-meta"><span>{paper.venue}</span><Link href={`/tracks/${track.id}#${stage.id}`}>{stage.name} ↗</Link><label><span className="sr-only">当前论文阅读状态</span><select aria-label="当前论文阅读状态" disabled={!ready} value={entries[paper.id]?.status ?? "unread"} onChange={(event) => update(paper.id, { status: event.target.value as ReadingStatus })}>{Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></div>
      <div className="atlas-reader-tabs" aria-label="论文内容">{tabs.map((item) => <button key={item.id} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.name}{item.id === "notes" && entries[paper.id]?.note && <i aria-label="有笔记" />}</button>)}</div>
      <div className="atlas-reader-content" key={paper.id}>
        {tab === "overview" && <><FrameworkFigure key={paper.id} paper={paper} /><div className="atlas-insights"><article><span>01 / THE IDEA</span><h3>核心贡献</h3><p>{paper.summary}</p></article><article><span>02 / WHAT CHANGES</span><h3>{framework ? "方法差异" : "为什么读"}</h3><p>{framework?.change ?? paper.why}</p></article><article><span>03 / READ CRITICALLY</span><h3>证据与局限</h3><p>{paper.watchFor}</p></article></div>
          <section className="atlas-neighbors"><div className="atlas-subheading"><h3>沿着联系，继续探索</h3><span>{activeEdges.length ? `${activeEdges.length} 条线索` : "同阶段阅读"}</span></div>{activeEdges.length ? activeEdges.map((edge) => { const other = getPaper(edge.from === paper.id ? edge.to : edge.from)!; return <button key={other.id} onClick={() => selectPaper(other.id)}><span className={`atlas-relation-mark ${edge.kind}`}>{edge.kind === "reading" ? "→" : "⇄"}</span><span><strong>{other.name}<small>{edge.label}</small></strong><p>{edge.explanation}</p></span><b>↗</b></button>; }) : stage.papers.filter((id) => id !== paper.id).slice(0, 3).map((id) => <button key={id} onClick={() => selectPaper(id)}><span className="atlas-relation-mark reading">→</span><span><strong>{getPaper(id)?.name}</strong><p>{getPaper(id)?.summary}</p></span><b>↗</b></button>)}</section>
          <div className="atlas-reading-boundary">导读范围：{paper.reviewScope}</div></>}
        {tab === "compare" && <ComparePapers key={paper.id} paper={paper} onSelect={selectPaper} />}
        {tab === "notes" && <ReadingEditor key={paper.id} id={paper.id} />}
        {error && <p className="warning" role="alert">{error}</p>}
      </div>
      <div className="atlas-reader-footer"><a href={paper.links[0].url} target="_blank" rel="noreferrer"><span>↗</span><div><strong>打开原始资料</strong><small>论文、方法细节与实验结果</small></div><b>→</b></a><Link href={`/papers/${paper.id}`}>完整导读</Link></div>
    </aside></div>
    <div className="atlas-bottom-note"><span>每一篇论文，是一个出发点。<b>保持好奇，循图而行。</b></span><Link href="/sources">关于这份地图与资料来源 ↗</Link></div>
  </div>;
}
