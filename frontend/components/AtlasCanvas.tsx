"use client";

import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { assetPath, atlasLayout, frameworks, islands, relations } from "@/lib/atlas";
import { getPaper } from "@/lib/catalog";
import { CARD_HEIGHT, CARD_WIDTH, fitBounds, islandPath, MAX_ZOOM, MIN_ZOOM, zoomAt, type Camera, type Point } from "@/lib/atlas-geometry";
import { useReading } from "./ReadingProvider";

export type AtlasFocus = { kind: "paper" | "island" | "all"; id: string; sequence: number };
type Props = {
  selectedId: string; filteredIds: Set<string>; focus: AtlasFocus | null;
  readerOpen: boolean; expanded: boolean; onSelect: (id: string) => void;
  onToggleExpand: () => void; onCloseReader: () => void; onNavigateIsland: (id: string) => void;
};

const Terrain = memo(function Terrain() {
  return <svg className="canvas-terrain" width={atlasLayout.bounds.width} height={atlasLayout.bounds.height} aria-hidden="true">
    <defs>{islands.map((island) => <radialGradient key={island.id} id={`wash-${island.id}`}><stop offset="0" stopColor={island.color} stopOpacity=".14" /><stop offset=".85" stopColor={island.color} stopOpacity=".09" /><stop offset="1" stopColor={island.color} stopOpacity=".035" /></radialGradient>)}</defs>
    {atlasLayout.territories.map((area, index) => <g key={area.id}>
      {[1.05, 1.035, 1.02, .98, .955, .925].map((scale) => <path key={scale} d={islandPath(area)} fill="none" stroke={islands[index].color} strokeWidth="1.2" opacity=".12" transform={`translate(${area.x + area.width / 2} ${area.y + area.height / 2}) scale(${scale}) translate(${-area.x - area.width / 2} ${-area.y - area.height / 2})`} />)}
      <path d={islandPath(area)} fill={`url(#wash-${area.id})`} stroke={islands[index].color} strokeWidth="2" strokeOpacity=".25" />
    </g>)}
  </svg>;
});

export default function AtlasCanvas({ selectedId, filteredIds, focus, readerOpen, expanded, onSelect, onToggleExpand, onCloseReader, onNavigateIsland }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: .78 });
  const cameraRef = useRef(camera);
  const size = useRef({ width: 0, height: 0 });
  const [viewport, setViewport] = useState(size.current);
  const [dragging, setDragging] = useState(false);
  const [showRelations, setShowRelations] = useState(true);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ camera: Camera; center: Point; distance: number } | null>(null);
  const dragged = useRef(false);
  const { entries } = useReading();
  const commit = useCallback((next: Camera) => { cameraRef.current = next; setCamera(next); }, []);

  function availableWidth() { return Math.max(260, size.current.width - (readerOpen && size.current.width > 760 ? 510 : 0)); }
  function locatePaper(id: string) {
    const point = atlasLayout.points.find((item) => item.id === id);
    if (!point) return;
    const zoom = Math.max(.85, cameraRef.current.zoom);
    commit({ zoom, x: availableWidth() / 2 - (point.x + CARD_WIDTH / 2) * zoom, y: size.current.height / 2 - (point.y + CARD_HEIGHT / 2) * zoom });
  }
  function locateIsland(id: string) {
    const area = atlasLayout.territories.find((item) => item.id === id)!;
    const zoom = Math.max(.65, Math.min(.9, (availableWidth() - 60) / area.width));
    commit({ zoom, x: 30 - area.x * zoom, y: 65 - area.y * zoom });
  }
  function showAll() { commit(fitBounds(atlasLayout.bounds, { width: availableWidth(), height: size.current.height }, 32)); }
  function changeZoom(factor: number) { commit(zoomAt(cameraRef.current, cameraRef.current.zoom * factor, { x: availableWidth() / 2, y: size.current.height / 2 })); }

  useEffect(() => {
    const element = host.current!;
    const observer = new ResizeObserver(() => {
      const next = { width: element.clientWidth, height: element.clientHeight };
      if (!next.width || !next.height) return;
      if (!size.current.width) {
        const zoom = next.width < 600 ? .7 : .78;
        commit({ zoom, x: 30 - (next.width < 600 ? 210 : 120) * zoom, y: 65 - 120 * zoom });
      } else {
        commit({ ...cameraRef.current, x: cameraRef.current.x + (next.width - size.current.width) / 2, y: cameraRef.current.y + (next.height - size.current.height) / 2 });
      }
      size.current = next; setViewport(next);
    });
    observer.observe(element);
    // A non-passive listener confines wheel gestures to the canvas, not the page.
    const wheel = (event: WheelEvent) => {
      if ((event.target as Element).closest("[data-canvas-control]")) return;
      event.preventDefault();
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        commit({ ...cameraRef.current, x: cameraRef.current.x - (event.shiftKey ? event.deltaY : event.deltaX), y: cameraRef.current.y - (event.shiftKey ? 0 : event.deltaY) });
      } else {
        const rect = element.getBoundingClientRect();
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
        commit(zoomAt(cameraRef.current, cameraRef.current.zoom * Math.exp(-delta * (event.ctrlKey ? .008 : .002)), { x: event.clientX - rect.left, y: event.clientY - rect.top }));
      }
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => { observer.disconnect(); element.removeEventListener("wheel", wheel); };
  }, [commit]);

  useEffect(() => {
    if (!focus) return;
    if (focus.kind === "paper") locatePaper(focus.id); else if (focus.kind === "island") locateIsland(focus.id); else showAll();
    // Navigation is intentional; resizing or closing the reader must not reset the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  function centerAndDistance() {
    const values = [...pointers.current.values()];
    const a = values[0], b = values[1] ?? a;
    return { center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.hypot(a.x - b.x, a.y - b.y) };
  }
  function localPoint(event: PointerEvent) {
    const rect = host.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function startPointer(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as Element).closest("[data-canvas-control]")) return;
    if (!pointers.current.size) dragged.current = false;
    pointers.current.set(event.pointerId, localPoint(event));
    gesture.current = { camera: cameraRef.current, ...centerAndDistance() };
    if (pointers.current.size > 1) { dragged.current = true; event.currentTarget.setPointerCapture(event.pointerId); }
    if (!(event.target as Element).closest("button")) event.currentTarget.focus({ preventScroll: true });
  }
  function movePointer(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, localPoint(event));
    const current = centerAndDistance(), start = gesture.current;
    const dx = current.center.x - start.center.x, dy = current.center.y - start.center.y;
    if (!dragged.current && Math.hypot(dx, dy) < 5 && pointers.current.size < 2) return;
    dragged.current = true; setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = start.distance > 0 && pointers.current.size > 1 ? zoomAt(start.camera, start.camera.zoom * current.distance / start.distance, start.center) : start.camera;
    commit({ ...next, x: next.x + dx, y: next.y + dy });
  }
  function endPointer(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (pointers.current.size) gesture.current = { camera: cameraRef.current, ...centerAndDistance() };
    else { gesture.current = null; setDragging(false); }
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const pan: Record<string, Point> = { ArrowLeft: { x: 90, y: 0 }, ArrowRight: { x: -90, y: 0 }, ArrowUp: { x: 0, y: 90 }, ArrowDown: { x: 0, y: -90 } };
    if (pan[event.key]) { event.preventDefault(); commit({ ...cameraRef.current, x: cameraRef.current.x + pan[event.key].x, y: cameraRef.current.y + pan[event.key].y }); }
    if (["+", "=", "-", "Home", "0"].includes(event.key)) { event.preventDefault(); if (["Home", "0"].includes(event.key)) showAll(); else changeZoom(event.key === "-" ? 1 / 1.25 : 1.25); }
    if (event.key === "Escape") { if (readerOpen) onCloseReader(); else if (expanded) onToggleExpand(); }
  }

  return <div ref={host} id="research-canvas" className={`atlas-canvas ${dragging ? "is-dragging" : ""}`} tabIndex={0} role="region" aria-label="可自由平移缩放的研究群岛画布" aria-describedby="canvas-help"
    onPointerDown={startPointer} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer} onKeyDown={keyboard}
    onClickCapture={(event) => { if (dragged.current && !(event.target as Element).closest("[data-canvas-control]")) { event.preventDefault(); event.stopPropagation(); } dragged.current = false; }}
    style={{ backgroundPosition: `${camera.x}px ${camera.y}px`, backgroundSize: `${Math.max(8, 28 * camera.zoom)}px ${Math.max(8, 28 * camera.zoom)}px` }}>
    <div className="canvas-world" style={{ width: atlasLayout.bounds.width, height: atlasLayout.bounds.height, transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}>
      <Terrain />
      {showRelations && <svg className="canvas-relations" width={atlasLayout.bounds.width} height={atlasLayout.bounds.height} aria-hidden="true">{relations.map((edge) => {
        const from = atlasLayout.points.find((point) => point.id === edge.from)!;
        const to = atlasLayout.points.find((point) => point.id === edge.to)!;
        const active = edge.from === selectedId || edge.to === selectedId;
        if (!filteredIds.has(from.id) || !filteredIds.has(to.id)) return null;
        const ax = from.x + CARD_WIDTH / 2, ay = from.y + CARD_HEIGHT;
        const bx = to.x + CARD_WIDTH / 2, by = to.y;
        return <path key={`${edge.from}-${edge.to}`} className={`${edge.kind} ${active ? "active" : ""}`} d={`M${ax} ${ay} C${ax} ${ay + 100} ${bx} ${by - 100} ${bx} ${by}`}><title>{`${edge.label}：${edge.explanation}`}</title></path>;
      })}</svg>}
      {atlasLayout.territories.map((area, index) => <div key={area.id} className="canvas-island-heading" style={{ left: area.x + 120, top: area.y + 85, color: islands[index].color }}><span>0{index + 1} / {islands[index].english}</span><h2>{islands[index].name}</h2><p>{islands[index].question} <b>{atlasLayout.points.filter((point) => point.track === area.id).length} 篇工作</b></p></div>)}
      {atlasLayout.stages.map((stage) => <div className="canvas-stage-heading" key={`${stage.track}-${stage.id}`} style={{ left: stage.x, top: stage.y }}><span>{stage.name}</span><small>{stage.count}</small></div>)}
      {atlasLayout.points.map((point) => {
        const paper = getPaper(point.id)!, figure = frameworks[point.id]?.figure;
        const color = islands.find((island) => island.id === paper.track)!.color;
        const dimmed = !filteredIds.has(point.id);
        return <button key={point.id} className={`canvas-paper ${point.id === selectedId ? "selected" : ""} ${dimmed ? "dimmed" : ""}`} style={{ left: point.x, top: point.y, width: CARD_WIDTH, height: CARD_HEIGHT, "--island": color } as CSSProperties}
          tabIndex={dimmed ? -1 : 0} aria-label={`查看 ${paper.name}，${paper.year}`} aria-pressed={point.id === selectedId} onClick={() => onSelect(point.id)}
          onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) { locatePaper(point.id); host.current?.scrollTo(0, 0); } }}>
          {figure ? <div className="canvas-paper-image"><img src={assetPath(`/figures/${figure.file}`)} alt={`${paper.name} 框架图`} draggable="false" /><span>作者原图 ↗</span></div> : <div className="canvas-paper-summary"><span>研究要点 <small>框架原图待补充</small></span><p>{paper.summary}</p><i>打开论文导读 ↗</i></div>}
          <div className="canvas-paper-caption"><strong>{paper.name}</strong><small>{paper.year}{entries[paper.id]?.status === "done" ? " · 已读" : ""}</small></div>
        </button>;
      })}
    </div>
    <nav className="canvas-island-nav" data-canvas-control aria-label="群岛快捷定位">{islands.map((island) => <button key={island.id} style={{ "--island": island.color } as CSSProperties} onClick={() => onNavigateIsland(island.id)}><i />{island.id === "world-models" ? "世界模型" : island.id === "vla" ? "VLA" : "Agent"}<span>{atlasLayout.points.filter((point) => point.track === island.id).length}</span></button>)}</nav>
    <div className="canvas-top-actions" data-canvas-control><button aria-pressed={showRelations} onClick={() => setShowRelations(!showRelations)}>{showRelations ? "隐藏联系" : "显示联系"}</button><button onClick={onToggleExpand}>{expanded ? "退出全屏" : "全屏画布"}</button></div>
    {!filteredIds.size && <div className="canvas-empty" role="status">没有匹配的论文，试试清空搜索或筛选。</div>}
    <div className="canvas-minimap" data-canvas-control><button onClick={showAll} aria-label="通过小地图返回全部群岛"><svg viewBox={`0 0 ${atlasLayout.bounds.width} ${atlasLayout.bounds.height}`} aria-hidden="true">{atlasLayout.territories.map((area, i) => <path key={area.id} d={islandPath(area)} fill={islands[i].color} opacity=".16" />)}{atlasLayout.points.map((point) => <rect key={point.id} x={point.x} y={point.y} width={CARD_WIDTH} height={CARD_HEIGHT} rx="12" fill={point.id === selectedId ? "#387995" : "#7b9587"} opacity={filteredIds.has(point.id) ? .85 : .2} />)}<rect x={-camera.x / camera.zoom} y={-camera.y / camera.zoom} width={viewport.width / camera.zoom} height={viewport.height / camera.zoom} fill="#fffefa22" stroke="#456e7c" strokeWidth="18" /></svg><span>全览 · {atlasLayout.points.length} 篇工作</span></button></div>
    <div className="canvas-controls" data-canvas-control><button aria-label="缩小画布" disabled={camera.zoom <= MIN_ZOOM} onClick={() => changeZoom(1 / 1.25)}>−</button><span aria-live="off">{Math.round(camera.zoom * 100)}%</span><button aria-label="放大画布" disabled={camera.zoom >= MAX_ZOOM} onClick={() => changeZoom(1.25)}>＋</button><i /><button onClick={showAll}>全部群岛</button><button onClick={() => locatePaper(selectedId)}>定位当前论文</button></div>
    <p className="canvas-help" id="canvas-help" data-canvas-control>拖拽移动 · 滚轮 / 双指缩放 · Shift + 滚轮平移 · 方向键移动 · Home 全览</p>
  </div>;
}
