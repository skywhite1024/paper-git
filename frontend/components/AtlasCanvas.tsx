"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { atlasLayout, islands } from "@/lib/atlas";
import { CARD_HEIGHT, CARD_WIDTH, fitBounds, intersects, MAX_ZOOM, MIN_ZOOM, viewportBounds, zoomAt, type Camera, type Point } from "@/lib/atlas-geometry";
import { Landmarks, MiniMapTerrain, PaperLayer, RouteLayer } from "./AtlasLayers";

export type AtlasFocus = { kind: "paper" | "island" | "all"; id: string; sequence: number };
type Props = {
  selectedId: string; filteredIds: Set<string>; focus: AtlasFocus | null;
  readerOpen: boolean; expanded: boolean; onSelect: (id: string) => void;
  onToggleExpand: () => void; onCloseReader: () => void; onNavigateIsland: (id: string) => void;
};

export default function AtlasCanvas({ selectedId, filteredIds, focus, readerOpen, expanded, onSelect, onToggleExpand, onCloseReader, onNavigateIsland }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: .78 });
  const cameraRef = useRef(camera);
  const size = useRef({ width: 0, height: 0 });
  const [viewport, setViewport] = useState(size.current);
  const [dragging, setDragging] = useState(false);
  const [showRelations, setShowRelations] = useState(true);
  const [activeTrack, setActiveTrack] = useState("world-models");
  const [activeStage, setActiveStage] = useState("latent-control");
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ camera: Camera; center: Point; distance: number } | null>(null);
  const dragged = useRef(false);
  const frame = useRef<number | null>(null);
  const commit = useCallback((next: Camera) => {
    cameraRef.current = next;
    if (frame.current === null) frame.current = requestAnimationFrame(() => { frame.current = null; setCamera(cameraRef.current); });
  }, []);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; }, []);

  function availableWidth() { return Math.max(260, size.current.width - (readerOpen && size.current.width > 760 ? 510 : 0)); }
  const locatePaper = useCallback((id: string) => {
    const point = atlasLayout.points.find((item) => item.id === id);
    if (!point) return;
    const zoom = Math.max(.85, cameraRef.current.zoom);
    commit({ zoom, x: availableWidth() / 2 - (point.x + CARD_WIDTH / 2) * zoom, y: size.current.height / 2 - (point.y + CARD_HEIGHT / 2) * zoom });
    host.current?.scrollTo(0, 0);
  // Width is read from the latest ResizeObserver measurement.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit, readerOpen]);
  function locateIsland(id: string) {
    const area = atlasLayout.territories.find((item) => item.id === id)!;
    setActiveTrack(id); setActiveStage("");
    commit(fitBounds(area, { width: availableWidth(), height: size.current.height }, 64));
  }
  function stageBounds(track: string, id: string) {
    const nodes = atlasLayout.points.filter((point) => point.track === track && point.stage === id);
    const x = Math.min(...nodes.map((p) => p.x)) - 30, y = Math.min(...nodes.map((p) => p.y)) - 30;
    return { x, y, width: Math.max(...nodes.map((p) => p.x + CARD_WIDTH)) - x + 30, height: Math.max(...nodes.map((p) => p.y + CARD_HEIGHT)) - y + 30 };
  }
  const locateStage = useCallback((track: string, id: string) => {
    setActiveTrack(track); setActiveStage(id);
    commit(fitBounds(stageBounds(track, id), { width: availableWidth(), height: size.current.height - 80 }, 42));
    commit({ ...cameraRef.current, y: cameraRef.current.y + 65 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit, readerOpen]);
  function showAll() { commit(fitBounds(atlasLayout.bounds, { width: availableWidth(), height: size.current.height }, 32)); }
  function changeZoom(factor: number) { commit(zoomAt(cameraRef.current, cameraRef.current.zoom * factor, { x: availableWidth() / 2, y: size.current.height / 2 })); }

  useEffect(() => {
    const element = host.current!;
    const observer = new ResizeObserver(() => {
      const next = { width: element.clientWidth, height: element.clientHeight };
      if (!next.width || !next.height) return;
      if (!size.current.width) {
        const start = atlasLayout.points.find((point) => point.id === "dreamerv2")!;
        const zoom = next.width < 600 ? .5 : .62;
        commit({ zoom, x: next.width / 2 - (start.x + CARD_WIDTH / 2) * zoom, y: next.height / 2 + 25 - (start.y + CARD_HEIGHT / 2) * zoom });
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
    if (focus.kind === "paper") { const point = atlasLayout.points.find((item) => item.id === focus.id)!; setActiveTrack(point.track); setActiveStage(point.stage); locatePaper(focus.id); } else if (focus.kind === "island") locateIsland(focus.id); else showAll();
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

  const view = viewportBounds(camera, viewport);
  const visibleKey = viewport.width ? atlasLayout.points.filter((point) => point.id === selectedId || intersects({ ...point, width: CARD_WIDTH, height: CARD_HEIGHT }, view)).map((point) => point.id).join("|") : "";

  return <div ref={host} id="research-canvas" className={`atlas-canvas ${dragging ? "is-dragging" : ""}`} tabIndex={0} role="region" aria-label="可自由平移缩放的研究群岛画布" aria-describedby="canvas-help"
    onPointerDown={startPointer} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer} onKeyDown={keyboard}
    onClickCapture={(event) => { if (dragged.current && !(event.target as Element).closest("[data-canvas-control]")) { event.preventDefault(); event.stopPropagation(); } dragged.current = false; }}
>
    <div className="canvas-world" style={{ width: atlasLayout.bounds.width, height: atlasLayout.bounds.height, transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}>
      <Landmarks onStage={locateStage} />
      {showRelations && <RouteLayer selectedId={selectedId} filteredIds={filteredIds} readerOpen={readerOpen} labels={camera.zoom > .28} />}
      <PaperLayer visibleKey={visibleKey} selectedId={selectedId} filteredIds={filteredIds} originalImages={camera.zoom > 1.1} onSelect={onSelect} onLocate={locatePaper} />
    </div>
    <nav className="canvas-island-nav" data-canvas-control aria-label="群岛快捷定位">{islands.map((island) => <button key={island.id} style={{ "--island": island.color } as CSSProperties} onClick={() => onNavigateIsland(island.id)}><i />{island.id === "world-models" ? "世界模型" : island.id === "vla" ? "VLA" : "Agent"}<span>{atlasLayout.points.filter((point) => point.track === island.id).length}</span></button>)}</nav>
    <nav className="canvas-branch-nav" data-canvas-control aria-label="研究分支路线">{atlasLayout.stages.filter((stage) => stage.track === activeTrack).map((stage) => <button key={stage.id} aria-pressed={activeStage === stage.id} onClick={() => locateStage(stage.track, stage.id)}><span>0{stage.sector + 1}</span>{stage.name}</button>)}</nav>
    <div className="canvas-route-legend" data-canvas-control><span><i />方法延伸</span><span><i className="reading" />阅读路径</span><span><i className="compare" />方法对照</span><small>圈层是阅读深度，不是统一年表</small></div>
    <div className="canvas-top-actions" data-canvas-control><button aria-pressed={showRelations} onClick={() => setShowRelations(!showRelations)}>{showRelations ? "隐藏联系" : "显示联系"}</button><button onClick={onToggleExpand}>{expanded ? "退出全屏" : "全屏画布"}</button></div>
    {!filteredIds.size && <div className="canvas-empty" role="status">没有匹配的论文，试试清空搜索或筛选。</div>}
    <div className="canvas-minimap" data-canvas-control><button onClick={showAll} aria-label="通过小地图返回全部群岛"><svg viewBox={`0 0 ${atlasLayout.bounds.width} ${atlasLayout.bounds.height}`} aria-hidden="true"><MiniMapTerrain selectedId={selectedId} filteredIds={filteredIds} /><rect x={-camera.x / camera.zoom} y={-camera.y / camera.zoom} width={viewport.width / camera.zoom} height={viewport.height / camera.zoom} fill="#fffefa22" stroke="#456e7c" strokeWidth="18" /></svg><span>全览 · {atlasLayout.points.length} 篇工作</span></button></div>
    <div className="canvas-controls" data-canvas-control><button aria-label="缩小画布" disabled={camera.zoom <= MIN_ZOOM} onClick={() => changeZoom(1 / 1.25)}>−</button><span aria-live="off">{Math.round(camera.zoom * 100)}%</span><button aria-label="放大画布" disabled={camera.zoom >= MAX_ZOOM} onClick={() => changeZoom(1.25)}>＋</button><i /><button onClick={showAll}>全部群岛</button><button onClick={() => locatePaper(selectedId)}>定位当前论文</button></div>
    <p className="canvas-help" id="canvas-help" data-canvas-control>拖拽移动 · 滚轮 / 双指缩放 · Shift + 滚轮平移 · 方向键移动 · Home 全览</p>
  </div>;
}
