"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { getPaper, getTrack, papers, type Paper } from "@/lib/catalog";
import { frameworks, islands, matchPaper, orderedPapers, relations } from "@/lib/atlas";
import { statusNames, type ReadingStatus } from "@/lib/reading";
import { useReading } from "./ReadingProvider";
import FrameworkFigure from "./FrameworkFigure";
import ReadingEditor, { type ReadingEditorHandle } from "./ReadingEditor";
import AtlasCanvas, { type AtlasFocus } from "./AtlasCanvas";

type ReaderTab = "overview" | "compare" | "notes";
const tabs: { id: ReaderTab; name: string }[] = [{ id: "overview", name: "论文导读" }, { id: "compare", name: "方法对照" }, { id: "notes", name: "阅读笔记" }];

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
  const [indexOpen, setIndexOpen] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [focus, setFocus] = useState<AtlasFocus | null>(null);
  const reader = useRef<HTMLElement>(null);
  const editor = useRef<ReadingEditorHandle>(null);
  const workbench = useRef<HTMLDivElement>(null);
  const { entries, ready, update, error } = useReading();
  const paper = getPaper(selectedId)!;
  const framework = frameworks[paper.id];
  const track = getTrack(paper.track)!;
  const stage = track.stages.find((item) => item.papers.includes(paper.id))!;
  const position = stage.papers.indexOf(paper.id);
  const filtered = orderedPapers.filter((item) => (scope === "all" || item.track === scope) && (year === "all" || String(item.year) === year) && matchPaper(item, query));
  const filteredIds = new Set(filtered.map((item) => item.id));
  const hasFilters = scope !== "all" || year !== "all" || query.trim() !== "";
  const activeEdges = relations.filter((edge) => edge.from === selectedId || edge.to === selectedId);
  const years = [...new Set(papers.map((item) => item.year))].sort((a, b) => b - a);

  useEffect(() => {
    if (!expanded || !workbench.current) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    let current: HTMLElement = workbench.current;
    // Only the fullscreen workspace remains interactive, including nested image dialogs.
    while (current.parentElement && current !== document.body) {
      for (const sibling of current.parentElement.children) {
        if (sibling instanceof HTMLElement && sibling !== current) {
          siblings.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      current = current.parentElement;
    }
    document.body.style.overflow = "hidden";
    document.getElementById("research-canvas")?.focus({ preventScroll: true });
    return () => {
      siblings.forEach(({ element, inert }) => { element.inert = inert; });
      document.body.style.overflow = overflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [expanded]);

  useEffect(() => {
    const canvas = document.getElementById("research-canvas");
    if (!canvas) return;
    const media = window.matchMedia("(max-width: 760px)");
    const sync = () => {
      canvas.inert = readerOpen && media.matches;
      if (canvas.inert && (canvas.contains(document.activeElement) || document.activeElement === document.body)) reader.current?.querySelector("button")?.focus({ preventScroll: true });
    };
    sync(); media.addEventListener("change", sync);
    return () => { canvas.inert = false; media.removeEventListener("change", sync); };
  }, [readerOpen]);

  useEffect(() => {
    const leave = (event: MouseEvent) => {
      const link = (event.target as Element).closest("a[href]");
      if (link && editor.current && !editor.current.savePending()) { event.preventDefault(); event.stopPropagation(); }
    };
    document.addEventListener("click", leave, true);
    return () => document.removeEventListener("click", leave, true);
  }, []);

  function navigate(kind: AtlasFocus["kind"], id: string) {
    setFocus((previous) => ({ kind, id, sequence: (previous?.sequence ?? 0) + 1 }));
  }
  function selectPaper(id: string) {
    if (editor.current && !editor.current.savePending()) return;
    if (!filteredIds.has(id)) resetFilters();
    setSelectedId(id); setTab("overview"); setReaderOpen(true); setIndexOpen(false);
    navigate("paper", id);
    reader.current?.scrollTo({ top: 0 });
  }
  function closeReader() {
    if (editor.current && !editor.current.savePending()) return;
    // Move focus before unmounting so the note editor can save on blur.
    const canvas = document.getElementById("research-canvas");
    if (canvas) { canvas.inert = false; canvas.focus({ preventScroll: true }); }
    setReaderOpen(false);
  }
  function resetFilters() { setScope("all"); setYear("all"); setQuery(""); }
  function exploreIsland(id: string) {
    if (editor.current && !editor.current.savePending()) return;
    resetFilters(); setReaderOpen(false); setIndexOpen(false); navigate("island", id);
  }
  function chooseScope(id: string) {
    if (editor.current && !editor.current.savePending()) return;
    setScope(id); setReaderOpen(false); navigate(id === "all" ? "all" : "island", id);
  }
  function chooseTab(id: ReaderTab) {
    if (editor.current && !editor.current.savePending()) return;
    setTab(id);
  }

  return <div className="research-atlas">
    <header className="atlas-heading"><div><p className="eyebrow">AN ATLAS OF EMBODIED INTELLIGENCE</p><h1>研究群岛<span>从问题起点，一圈圈读懂方法演进。</span></h1><p>{papers.length} 篇工作 · {Object.keys(frameworks).length} 张作者原图。选择研究分支，沿编号向外探索。</p></div><div className="atlas-collection"><strong>{papers.length}</strong><span>篇精选研究<br /><b>3</b> 座知识群岛</span></div></header>
    <div className="atlas-toolbar"><label className="atlas-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><input aria-label="搜索群岛中的论文" placeholder="搜索论文、方法或研究问题…" value={query} onFocus={() => { if (query) setIndexOpen(true); }} onChange={(event) => { setQuery(event.target.value); setIndexOpen(true); }} />{query && <button onClick={() => setQuery("")} aria-label="清空搜索">×</button>}</label><div className="atlas-scope" aria-label="研究方向"><button aria-pressed={scope === "all"} onClick={() => chooseScope("all")}>全部群岛</button>{islands.map((island) => <button key={island.id} style={{ "--island": island.color } as CSSProperties} aria-pressed={scope === island.id} onClick={() => chooseScope(island.id)}><i />{island.id === "world-models" ? "世界模型" : island.id === "vla" ? "VLA" : "Agent"}</button>)}</div><label className="atlas-year"><span className="sr-only">发表年份</span><select aria-label="发表年份" value={year} onChange={(event) => { setYear(event.target.value); setIndexOpen(true); }}><option value="all">全部年份</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><button className="canvas-index-toggle" aria-expanded={indexOpen} onClick={() => setIndexOpen(!indexOpen)}>论文索引 {papers.length}</button></div>
    <div ref={workbench} className={`atlas-workbench ${expanded ? "expanded" : ""}`} role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label={expanded ? "全屏研究群岛" : undefined} onKeyDown={(event) => {
      if ((event.target as Element).closest("dialog[open]")) return;
      if (expanded && event.key === "Tab") {
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]')].filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && !element.closest("[inert]") && element.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && event.target === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && event.target === last) { event.preventDefault(); first?.focus(); }
      }
      if (event.key !== "Escape" || event.nativeEvent.isComposing || event.defaultPrevented || (event.target as Element).closest("dialog[open]")) return;
      event.preventDefault();
      if (readerOpen) closeReader(); else if (indexOpen) setIndexOpen(false); else if (expanded) setExpanded(false);
    }}>
      <AtlasCanvas selectedId={selectedId} filteredIds={filteredIds} focus={focus} readerOpen={readerOpen} expanded={expanded} onSelect={selectPaper} onToggleExpand={() => setExpanded(!expanded)} onNavigateIsland={exploreIsland} />
      {indexOpen && <section className="canvas-paper-index" aria-label="论文搜索与索引"><header><strong>{hasFilters ? "筛选结果" : "全部论文"} · {filtered.length}</strong><button aria-label="收起论文索引" onClick={() => setIndexOpen(false)}>×</button></header><p role="status">全部工作均在画布中，选择一篇可直接定位。</p>{hasFilters && <button className="text-button" onClick={resetFilters}>清除筛选</button>}{islands.map((island) => <div key={island.id} className="canvas-index-group"><h3 style={{ color: island.color }}>{island.name}</h3>{filtered.filter((item) => item.track === island.id).map((item) => <button key={item.id} onClick={() => selectPaper(item.id)} aria-pressed={item.id === selectedId}><span>{item.name}</span><small>{item.year}</small></button>)}</div>)}{!filtered.length && <p>没有匹配项，清除筛选后重新探索。</p>}</section>}
    {readerOpen && <aside className="atlas-reader" aria-label="当前论文解读" ref={reader}>
      <div className="atlas-reader-identity"><div className="atlas-reader-kicker"><span style={{ color: islands.find((island) => island.id === paper.track)!.color }}>{track.name}</span><div className="atlas-reader-actions"><Link href={`/papers/${paper.id}`} aria-label={`打开 ${paper.name} 详情`}>↗</Link><button aria-label="收起论文解读" onClick={closeReader}>×</button></div></div><div className="atlas-reader-title"><h2>{paper.name}</h2><span>{paper.year}</span></div><p>{paper.title}</p><div className="atlas-reader-meta"><span>{paper.venue}</span><Link href={`/tracks/${track.id}#${stage.id}`}>{stage.name} ↗</Link><label><span className="sr-only">当前论文阅读状态</span><select aria-label="当前论文阅读状态" disabled={!ready} value={entries[paper.id]?.status ?? "unread"} onChange={(event) => update(paper.id, { status: event.target.value as ReadingStatus })}>{Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></div>
      <div className="atlas-reader-tabs" aria-label="论文内容">{tabs.map((item) => <button key={item.id} aria-pressed={tab === item.id} onClick={() => chooseTab(item.id)}>{item.name}{item.id === "notes" && entries[paper.id]?.note && <i aria-label="有笔记" />}</button>)}</div>
      <nav className="atlas-reading-sequence" aria-label="沿当前研究分支逐篇阅读">
        <button disabled={position === 0} onClick={() => selectPaper(stage.papers[position - 1])} title={getPaper(stage.papers[position - 1])?.name}>← 分支上一篇</button>
        <span aria-live="polite" aria-atomic="true">{paper.name}<small>{stage.name} · {position + 1} / {stage.papers.length}</small></span>
        <button disabled={position === stage.papers.length - 1} onClick={() => selectPaper(stage.papers[position + 1])} title={getPaper(stage.papers[position + 1])?.name}>分支下一篇 →</button>
      </nav>
      <div className="atlas-reader-content" key={paper.id}>
        {tab === "overview" && <><FrameworkFigure key={paper.id} paper={paper} /><div className="atlas-insights"><article><span>01 / THE IDEA</span><h3>核心贡献</h3><p>{paper.summary}</p></article><article><span>02 / WHAT CHANGES</span><h3>{framework ? "方法差异" : "为什么读"}</h3><p>{framework?.change ?? paper.why}</p></article><article><span>03 / READ CRITICALLY</span><h3>证据与局限</h3><p>{paper.watchFor}</p></article></div>
          <section className="atlas-neighbors"><div className="atlas-subheading"><h3>沿着联系，继续探索</h3><span>{activeEdges.length ? `${activeEdges.length} 条线索` : "同阶段阅读"}</span></div>{activeEdges.length ? activeEdges.map((edge) => { const other = getPaper(edge.from === paper.id ? edge.to : edge.from)!; return <button key={other.id} onClick={() => selectPaper(other.id)}><span className={`atlas-relation-mark ${edge.kind}`}>{edge.kind === "compare" ? "⇄" : edge.from === paper.id ? "→" : "←"}</span><span><strong>{other.name}<small>{getPaper(edge.from)?.name} {edge.kind === "compare" ? "⇄" : "→"} {getPaper(edge.to)?.name} · {edge.label}</small></strong><p>{edge.explanation}</p></span><b>↗</b></button>; }) : stage.papers.filter((id) => id !== paper.id).slice(0, 3).map((id) => <button key={id} onClick={() => selectPaper(id)}><span className="atlas-relation-mark reading">→</span><span><strong>{getPaper(id)?.name}</strong><p>{getPaper(id)?.summary}</p></span><b>↗</b></button>)}</section>
          {activeEdges.length > 0 && <div className="atlas-route-evidence"><span>沿路线核对原文</span>{activeEdges.map((edge) => <a key={`${edge.from}-${edge.to}`} href={edge.source} target="_blank" rel="noreferrer">{edge.kind === "evolution" ? "方法延伸" : edge.kind === "compare" ? "方法对照" : "阅读线索"} · {edge.label} ↗</a>)}</div>}
          <div className="atlas-reading-boundary">导读范围：{paper.reviewScope}</div></>}
        {tab === "compare" && <ComparePapers key={paper.id} paper={paper} onSelect={selectPaper} />}
        {tab === "notes" && <ReadingEditor ref={editor} key={paper.id} id={paper.id} />}
        {error && <p className="warning" role="alert">{error}</p>}
      </div>
      <div className="atlas-reader-footer"><a href={paper.links[0].url} target="_blank" rel="noreferrer"><span>↗</span><div><strong>打开原始资料</strong><small>论文、方法细节与实验结果</small></div><b>→</b></a><Link href={`/papers/${paper.id}`}>完整导读</Link></div>
    </aside>}</div>
    <div className="atlas-bottom-note"><span>粗实线：方法延伸 · 细实线：建议阅读 · 虚线：方法对照。<b>圈层表示阅读深度；编号不是统一年表，连线不是引用统计。</b></span><Link href="/sources">关于这份地图与资料来源 ↗</Link></div>
  </div>;
}
