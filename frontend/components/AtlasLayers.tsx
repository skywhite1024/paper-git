"use client";

import { memo, type CSSProperties } from "react";
import { assetPath, atlasLayout, atlasPoints, atlasRoutes, frameworks, islands } from "@/lib/atlas";
import { getPaper } from "@/lib/catalog";
import { CARD_HEIGHT, CARD_WIDTH, islandPath } from "@/lib/atlas-geometry";
import { useReading } from "./ReadingProvider";
import PaperMetrics from "./PaperMetrics";

const Terrain = memo(function Terrain() {
  return <svg className="canvas-terrain" width={atlasLayout.bounds.width} height={atlasLayout.bounds.height} aria-hidden="true">
    <defs>{islands.map((island) => <radialGradient key={island.id} id={`wash-${island.id}`}><stop offset="0" stopColor={island.color} stopOpacity=".14" /><stop offset=".85" stopColor={island.color} stopOpacity=".09" /><stop offset="1" stopColor={island.color} stopOpacity=".035" /></radialGradient>)}</defs>
    {atlasLayout.territories.map((area, index) => <g key={area.id}>
      {[1.05, 1.02, .98, .955].map((scale) => <path key={scale} d={islandPath(area)} fill="none" stroke={islands[index].color} strokeWidth="1.2" opacity=".12" transform={`translate(${area.center.x} ${area.center.y}) scale(${scale}) translate(${-area.center.x} ${-area.center.y})`} />)}
      <path d={islandPath(area)} fill={`url(#wash-${area.id})`} stroke={islands[index].color} strokeWidth="2" strokeOpacity=".25" />
      {atlasLayout.rings.filter((ring) => ring.track === area.id).map((ring) => <g key={ring.index} className="canvas-orbit"><ellipse cx={ring.x} cy={ring.y} rx={ring.rx} ry={ring.ry} fill="none" stroke={islands[index].color} strokeWidth="64" opacity=".045" /><ellipse cx={ring.x} cy={ring.y} rx={ring.rx} ry={ring.ry} fill="none" stroke={islands[index].color} strokeWidth="1.5" strokeDasharray="3 12" opacity=".3" /><text x={ring.x} y={ring.y - ring.ry - 18} textAnchor="middle" fill={islands[index].color} fontSize="14" letterSpacing="3">{['问题起点', '方法展开', '延伸与验证', '扩展与迁移'][ring.index] ?? `进阶比较 ${ring.index + 1}`}</text></g>)}
    </g>)}
  </svg>;
});

export const RouteLayer = memo(function RouteLayer({ selectedId, filteredIds, readerOpen, labels }: { selectedId: string; filteredIds: Set<string>; readerOpen: boolean; labels: boolean }) {
  return <svg className="canvas-relations" width={atlasLayout.bounds.width} height={atlasLayout.bounds.height} aria-hidden="true"><defs><marker id="route-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M1 1 L11 6 L1 11Z" fill="#6c8b79" /></marker></defs>{atlasRoutes.map((edge) => {
    const active = edge.from === selectedId || edge.to === selectedId;
    if (!filteredIds.has(edge.from) || !filteredIds.has(edge.to) || (!edge.sequential && !(active && readerOpen))) return null;
    return <g key={`${edge.from}-${edge.to}`} className={`canvas-route ${edge.kind} ${active ? "active" : ""}`}><path d={edge.geometry.d} markerEnd="url(#route-arrow)"><title>{`${edge.label}：${edge.explanation}`}</title></path>{(labels || active) && <g className="canvas-route-label" transform={`translate(${edge.geometry.label.x} ${edge.geometry.label.y})`}><rect x={-edge.label.length * 9 - 16} y="-19" width={edge.label.length * 18 + 32} height="38" rx="19" /><text textAnchor="middle" dominantBaseline="central">{edge.label}</text></g>}</g>;
  })}</svg>;
});

export const Landmarks = memo(function Landmarks({ onStage }: { onStage: (track: string, stage: string) => void }) {
  return <><Terrain />
    {atlasLayout.territories.map((area, index) => <div key={area.id} className="canvas-island-heading" style={{ left: area.center.x, top: area.center.y, color: islands[index].color }}><span>0{index + 1} / {islands[index].english}</span><h2>{islands[index].name}</h2><p>{islands[index].question}</p><b>{atlasLayout.points.filter((point) => point.track === area.id).length} 篇工作 · 沿编号向外探索</b></div>)}
    {atlasLayout.stages.map((stage) => <button className="canvas-stage-heading" tabIndex={-1} key={`${stage.track}-${stage.id}`} style={{ left: stage.x, top: stage.y }} onClick={() => onStage(stage.track, stage.id)}><small>BRANCH 0{stage.sector + 1}</small><strong>{stage.name}</strong><span>{stage.question}</span><em>展开 {stage.count} 篇工作 ↗</em></button>)}
  </>;
});

// The camera moves the parent transform. Reconcile cards only when the visible set changes.
export const PaperLayer = memo(function PaperLayer({ visibleKey, selectedId, filteredIds, imageTier, onSelect, onLocate }: {
  visibleKey: string; selectedId: string; filteredIds: Set<string>; imageTier: "original" | "preview" | "overview";
  onSelect: (id: string) => void; onLocate: (id: string) => void;
}) {
  const { entries } = useReading();
  return <>{visibleKey.split("|").filter(Boolean).map((id) => {
    const point = atlasPoints.get(id)!, paper = getPaper(id)!, framework = frameworks[id];
    const color = islands.find((island) => island.id === paper.track)!.color;
    const dimmed = !filteredIds.has(id);
    return <button key={id} className={`canvas-paper ${id === selectedId ? "selected" : ""} ${dimmed ? "dimmed" : ""}`} style={{ left: point.x, top: point.y, width: CARD_WIDTH, height: CARD_HEIGHT, "--island": color } as CSSProperties}
      tabIndex={dimmed ? -1 : 0} aria-label={`查看 ${paper.name}，${paper.year}`} aria-pressed={id === selectedId} onClick={() => onSelect(id)}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) onLocate(id); }}>
      <b className="canvas-step-number">{String(point.order).padStart(2, "0")}</b>
      <div className="canvas-paper-image"><img src={assetPath(imageTier === "original" ? `/figures/${framework.figure.file}` : `/figures/${imageTier === "overview" ? "overview" : "previews"}/${id}.webp`)} alt={`${paper.name}：${framework.figure.title}`} draggable="false" decoding="async" loading="lazy" /><span>作者原图 ↗</span></div>
      <div className="canvas-paper-caption"><span><strong>{paper.name}</strong><em>{framework.mechanism}</em></span><small>{paper.year}{entries[id]?.status === "done" ? " · 已读" : ""}</small></div>
      <PaperMetrics id={id} links={false} />
    </button>;
  })}</>;
});

export const MiniMapTerrain = memo(function MiniMapTerrain({ selectedId, filteredIds }: { selectedId: string; filteredIds: Set<string> }) {
  return <>{atlasLayout.territories.map((area, i) => <path key={area.id} d={islandPath(area)} fill={islands[i].color} opacity=".16" />)}{atlasLayout.points.map((point) => <rect key={point.id} x={point.x} y={point.y} width={CARD_WIDTH} height={CARD_HEIGHT} rx="12" fill={point.id === selectedId ? "#387995" : "#7b9587"} opacity={filteredIds.has(point.id) ? .85 : .2} />)}</>;
});
