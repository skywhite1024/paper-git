"use client";

import { useMemo, useState } from "react";
import type { RouteEdge, RouteItem, RouteStage } from "@/lib/api";

const CARD_W = 212;
const CARD_H = 76;
const COL_GAP = 44;
const ROW_GAP = 14;
const HEADER_H = 64;
const PAD = 10;

const RELATION_COLOR: Record<string, string> = {
  evolve: "#0969da",
  enable: "#1a7f37",
  compare: "#bf8700",
};

type Placed = { label: string; stageIdx: number; rowIdx: number; item: RouteItem };

export default function RouteGraph({ stages, edges }: { stages: RouteStage[]; edges: RouteEdge[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const placed = useMemo<Placed[]>(() => {
    const out: Placed[] = [];
    stages.forEach((stage, si) => {
      stage.items.forEach((item, ri) => out.push({ label: item.label, stageIdx: si, rowIdx: ri, item }));
    });
    return out;
  }, [stages]);

  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number; col: number }>();
    for (const p of placed) {
      m.set(p.label, {
        x: PAD + p.stageIdx * (CARD_W + COL_GAP),
        y: HEADER_H + p.rowIdx * (CARD_H + ROW_GAP),
        col: p.stageIdx,
      });
    }
    return m;
  }, [placed]);

  const active = selected ?? hovered;
  const neighbors = useMemo(() => {
    if (!active) return null;
    const set = new Set<string>([active]);
    for (const e of edges) {
      if (e.from === active) set.add(e.to);
      if (e.to === active) set.add(e.from);
    }
    return set;
  }, [active, edges]);

  const width = PAD * 2 + stages.length * (CARD_W + COL_GAP) - COL_GAP;
  const height = HEADER_H + Math.max(...stages.map((s) => s.items.length), 1) * (CARD_H + ROW_GAP) + 10;

  const edgeColor = (rel: string) => RELATION_COLOR[rel] ?? "#6b7280";

  const pathFor = (fromLabel: string, toLabel: string) => {
    const a = pos.get(fromLabel)!;
    const b = pos.get(toLabel)!;
    if (b.col > a.col) {
      const x1 = a.x + CARD_W;
      const y1 = a.y + CARD_H / 2;
      const x2 = b.x;
      const y2 = b.y + CARD_H / 2;
      const bend = Math.max(20, (x2 - x1) * 0.45);
      return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2 - 2} ${y2}`;
    }
    const x1 = a.x + CARD_W / 2;
    const y1 = a.y + CARD_H;
    const x2 = b.x + CARD_W / 2;
    const y2 = b.y + CARD_H;
    const depth = Math.max(y1, y2) + 34;
    return `M ${x1} ${y1} C ${x1} ${depth}, ${x2} ${depth}, ${x2} ${y2 + 2}`;
  };

  const selectedItem = active ? placed.find((p) => p.label === active)?.item : null;
  const incoming = active ? edges.filter((e) => e.to === active) : [];
  const outgoing = active ? edges.filter((e) => e.from === active) : [];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-5" style={{ background: RELATION_COLOR.evolve }} /> 演进</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-5" style={{ background: RELATION_COLOR.enable }} /> 使能</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-5" style={{ background: RELATION_COLOR.compare }} /> 对比</span>
        <span>点击节点查看详情 · 悬停高亮上下游</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--pg-border)] bg-white">
        <div className="relative" style={{ width, height, minWidth: "100%" }}>
          <svg width={width} height={height} className="absolute inset-0">
            <defs>
              {Object.entries(RELATION_COLOR).map(([rel, color]) => (
                <marker key={rel} id={`rg-${rel}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 z" fill={color} />
                </marker>
              ))}
            </defs>
            {edges.map((e, i) => {
              if (!pos.get(e.from) || !pos.get(e.to)) return null;
              const color = edgeColor(e.relation);
              const dim = active && !(neighbors?.has(e.from) && neighbors?.has(e.to));
              return (
                <g key={i} opacity={dim ? 0.12 : 0.9}>
                  <path
                    d={pathFor(e.from, e.to)}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.8}
                    markerEnd={`url(#rg-${e.relation})`}
                  />
                  {e.label && (
                    <title>{`${e.from} → ${e.to}：${e.label}`}</title>
                  )}
                </g>
              );
            })}
          </svg>

          {stages.map((stage, si) => (
            <div
              key={stage.name}
              className="absolute rounded-md bg-gray-50/70"
              style={{ left: PAD + si * (CARD_W + COL_GAP) - 8, top: 6, width: CARD_W + 16, height: height - 16 }}
            >
              <div className="px-1 pt-2 text-center">
                <div className="text-xs font-semibold text-gray-700">
                  {si + 1}. {stage.name}
                </div>
                <div className="text-[10px] text-gray-400">{stage.items.length} 项</div>
              </div>
            </div>
          ))}

          {placed.map((p) => {
            const { x, y } = pos.get(p.label)!;
            const dim = active && !neighbors?.has(p.label);
            const isActive = p.label === active;
            return (
              <button
                key={p.label}
                onClick={() => setSelected(isActive ? null : p.label)}
                onMouseEnter={() => setHovered(p.label)}
                onMouseLeave={() => setHovered(null)}
                className={`absolute overflow-hidden rounded-lg border bg-white p-2 text-left transition-opacity ${
                  isActive ? "border-blue-600 shadow-md" : p.item.key ? "border-amber-400" : "border-[var(--pg-border)]"
                }`}
                style={{ left: x, top: y, width: CARD_W, height: CARD_H, opacity: dim ? 0.25 : 1 }}
              >
                <div className="flex items-center gap-1">
                  {p.item.key && <span title="关键工作">⭐</span>}
                  <span className="truncate text-[13px] font-semibold text-gray-900">{p.label}</span>
                  {p.item.year && <span className="ml-auto shrink-0 rounded bg-gray-100 px-1 text-[10px] text-gray-500">{p.item.year}</span>}
                </div>
                {p.item.note && <p className="mt-1 line-clamp-2 text-[10.5px] leading-tight text-gray-500">{p.item.note}</p>}
              </button>
            );
          })}
        </div>
      </div>

      {selectedItem && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-lg font-bold text-gray-900">{selectedItem.label}</h3>
            {selectedItem.year && <span className="text-sm text-gray-500">{selectedItem.year}</span>}
            {selectedItem.key && <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-700">关键工作</span>}
          </div>
          {selectedItem.full_title && <p className="mt-1 text-sm italic text-gray-600">{selectedItem.full_title}</p>}
          {selectedItem.note && <p className="mt-2 text-sm text-gray-700">{selectedItem.note}</p>}
          {selectedItem.url && (
            <a href={selectedItem.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
              论文链接 ↗
            </a>
          )}
          <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <div className="mb-1 font-semibold text-gray-500">上游（被演进/被使能）</div>
              <div className="flex flex-wrap gap-1">
                {incoming.length === 0 && <span className="text-gray-400">无</span>}
                {incoming.map((e) => (
                  <button key={e.from} onClick={() => setSelected(e.from)} className="rounded-full border border-[var(--pg-border)] bg-white px-2 py-0.5 hover:border-blue-400">
                    {e.from}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 font-semibold text-gray-500">下游（演进到/使能）</div>
              <div className="flex flex-wrap gap-1">
                {outgoing.length === 0 && <span className="text-gray-400">无</span>}
                {outgoing.map((e) => (
                  <button key={e.to} onClick={() => setSelected(e.to)} className="rounded-full border border-[var(--pg-border)] bg-white px-2 py-0.5 hover:border-blue-400">
                    {e.to}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
