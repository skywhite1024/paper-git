"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LINK_COLORS, routeColor } from "@/lib/routeColors";

export type GraphNode = {
  id: string;
  kind: "hub" | "paper";
  label: string;
  route?: string;
  stage?: string;
  stage_idx?: number;
  year?: number;
  key?: boolean;
};

export type GraphLink = { source: string; target: string; kind: string; label?: string };

export type RouteMeta = { id: string; name_zh: string; stages: string[] };

const COL_W = 560;
const COL_GAP = 70;
const MARGIN_X = 70;
const TOP_PAD = 150;
const BAND_H = 200;
const CARD_W = 124;
const CARD_H = 46;
const CARD_GAP_X = 12;
const CARD_GAP_Y = 10;

const PER_ROW = 4;

type Pos = { x: number; y: number; w: number; h: number; col: number; band: number };

export default function NetworkMap({
  nodes,
  links,
  routesMeta,
  selectedId,
  onSelect,
  activeRoutes,
  focusToken,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
  routesMeta: RouteMeta[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  activeRoutes: Set<string>;
  focusToken: { id: string; nonce: number } | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const view = useRef({ k: 1, tx: 0, ty: 0 });
  const dragState = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const layout = useMemo(() => {
    const pos = new Map<string, Pos>();
    const colIndex = new Map(routesMeta.map((r, i) => [r.id, i]));
    routesMeta.forEach((meta, col) => {
      const hub = nodes.find((n) => n.id === `hub:${meta.id}`);
      if (hub) {
        pos.set(hub.id, { x: MARGIN_X + col * (COL_W + COL_GAP), y: TOP_PAD, w: COL_W, h: 58, col, band: -1 });
      }
      const stageItems = new Map<string, GraphNode[]>();
      for (const n of nodes) {
        if (n.kind === "paper" && n.route === meta.id && n.stage_idx !== undefined) {
          const key = String(n.stage_idx);
          if (!stageItems.has(key)) stageItems.set(key, []);
          stageItems.get(key)!.push(n);
        }
      }
      for (const [bandKey, items] of stageItems) {
        const band = Number(bandKey);
        items.forEach((n, i) => {
          const row = Math.floor(i / PER_ROW);
          const colOffset = i % PER_ROW;
          pos.set(n.id, {
            x: MARGIN_X + col * (COL_W + COL_GAP) + 14 + colOffset * (CARD_W + CARD_GAP_X),
            y: TOP_PAD + 92 + band * BAND_H + 30 + row * (CARD_H + CARD_GAP_Y),
            w: CARD_W,
            h: CARD_H,
            col,
            band,
          });
        });
      }
    });
    const width = MARGIN_X * 2 + routesMeta.length * (COL_W + COL_GAP) - COL_GAP;
    const maxBands = Math.max(...routesMeta.map((r) => r.stages.length), 1);
    const height = TOP_PAD + 92 + maxBands * BAND_H + 40;
    return { pos, width, height, colIndex };
  }, [nodes, routesMeta]);

  const apply = () => {
    const { k, tx, ty } = view.current;
    if (gRef.current) gRef.current.setAttribute("transform", `translate(${tx} ${ty}) scale(${k})`);
  };

  const centerOn = (id: string, k = 1.15) => {
    const p = layout.pos.get(id);
    const svg = svgRef.current;
    if (!p || !svg) return;
    const rect = svg.getBoundingClientRect();
    view.current = {
      k,
      tx: rect.width / 2 - (p.x + p.w / 2) * k,
      ty: rect.height / 2 - (p.y + p.h / 2) * k,
    };
    apply();
  };

  useEffect(() => {
    if (focusToken) centerOn(focusToken.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusToken?.nonce]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    apply();
    // 初始适配宽度
    const rect = svg.getBoundingClientRect();
    const k = Math.min(1, rect.width / layout.width) * 0.98;
    view.current = { k, tx: (rect.width - layout.width * k) / 2, ty: 10 };
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.width]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { k, tx, ty } = view.current;
    const factor = Math.exp(-e.deltaY * 0.0016);
    const nk = Math.min(2.5, Math.max(0.08, k * factor));
    view.current = {
      k: nk,
      tx: mx - ((mx - tx) / k) * nk,
      ty: my - ((my - ty) / k) * nk,
    };
    apply();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest("[data-node]")) return;
    dragState.current = { x: e.clientX, y: e.clientY, tx: view.current.tx, ty: view.current.ty };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragState.current;
    if (!d) return;
    view.current.tx = d.tx + (e.clientX - d.x);
    view.current.ty = d.ty + (e.clientY - d.y);
    apply();
  };

  const onPointerUp = () => {
    dragState.current = null;
  };

  const reset = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const k = Math.min(1, rect.width / layout.width) * 0.98;
    view.current = { k, tx: (rect.width - layout.width * k) / 2, ty: 10 };
    apply();
  };

  const active = selectedId ?? hoverId;
  const neighbors = useMemo(() => {
    if (!active) return null;
    const set = new Set<string>([active]);
    for (const l of links) {
      if (l.source === active) set.add(l.target);
      if (l.target === active) set.add(l.source);
    }
    return set;
  }, [active, links]);

  const isActive = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    return !node || node.kind === "hub" || !node.route || activeRoutes.has(node.route);
  };

  const edgePath = (a: Pos, b: Pos, kind: string) => {
    if (kind === "loop") {
      const x1 = a.x + a.w / 2;
      const x2 = b.x + b.w / 2;
      const apex = Math.min(a.y, b.y) - 60;
      return `M ${x1} ${a.y} C ${x1} ${apex}, ${x2} ${apex}, ${x2} ${b.y}`;
    }
    const acx = a.x + a.w / 2;
    const acy = a.y + a.h / 2;
    const bcx = b.x + b.w / 2;
    const bcy = b.y + b.h / 2;
    if (a.band === b.band) {
      if (Math.abs(acy - bcy) < 2 && b.x > a.x) {
        const x1 = a.x + a.w;
        const x2 = b.x;
        const bend = Math.max(12, (x2 - x1) / 2);
        return `M ${x1} ${acy} C ${x1 + bend} ${acy}, ${x2 - bend} ${bcy}, ${x2 - 2} ${bcy}`;
      }
      const depth = Math.max(a.y + a.h, b.y + b.h) + 22;
      return `M ${acx} ${a.y + a.h} C ${acx} ${depth}, ${bcx} ${depth}, ${bcx} ${b.y + b.h - 2}`;
    }
    const midY = (a.y + a.h + b.y) / 2;
    return `M ${acx} ${a.y + a.h} C ${acx} ${midY}, ${bcx} ${midY}, ${bcx} ${b.y - 2}`;
  };

  return (
    <div className="relative h-[calc(100vh-190px)] min-h-[520px] overflow-hidden rounded-xl border border-[var(--pg-border)] bg-white">
      <div className="absolute left-3 top-3 z-10 flex gap-1">
        {[
          { t: "＋", fn: () => zoomBy(1.3) },
          { t: "－", fn: () => zoomBy(1 / 1.3) },
          { t: "复位", fn: reset },
        ].map((b) => (
          <button
            key={b.t}
            onClick={b.fn}
            className="rounded border border-[var(--pg-border)] bg-white/90 px-2 py-1 text-xs text-gray-600 shadow-sm hover:bg-gray-50"
          >
            {b.t}
          </button>
        ))}
      </div>
      <svg
        ref={svgRef}
        className="h-full w-full touch-none"
        style={{ cursor: dragState.current ? "grabbing" : "grab" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={reset}
      >
        <defs>
          {Object.entries(LINK_COLORS).map(([kind, color]) => (
            <marker key={kind} id={`nm-${kind}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill={color} />
            </marker>
          ))}
        </defs>
        <g ref={gRef}>
          {/* 阶段带 */}
          {routesMeta.map((meta, col) =>
            meta.stages.map((stage, band) => {
              const x = MARGIN_X + col * (COL_W + COL_GAP);
              const y = TOP_PAD + 92 + band * BAND_H;
              return (
                <g key={`${meta.id}-${band}`} opacity={activeRoutes.has(meta.id) ? 1 : 0.15}>
                  <rect x={x} y={y} width={COL_W} height={BAND_H - 14} rx={10} fill={routeColor(meta.id)} opacity={0.05} />
                  <rect x={x} y={y} width={COL_W} height={BAND_H - 14} rx={10} fill="none" stroke={routeColor(meta.id)} opacity={0.18} strokeDasharray="3 4" />
                  <text x={x + 12} y={y + 18} fontSize={12} fontWeight={600} fill={routeColor(meta.id)}>
                    {band + 1}. {stage}
                  </text>
                </g>
              );
            })
          )}

          {/* 连边 */}
          <g pointerEvents="none">
            {links.map((l, i) => {
              const a = layout.pos.get(l.source);
              const b = layout.pos.get(l.target);
              if (!a || !b) return null;
              const dim =
                (active && !(neighbors?.has(l.source) && neighbors?.has(l.target))) ||
                !isActive(l.source) ||
                !isActive(l.target);
              const color = LINK_COLORS[l.kind] ?? "#6b7280";
              return (
                <path
                  key={i}
                  d={edgePath(a, b, l.kind)}
                  fill="none"
                  stroke={color}
                  strokeWidth={l.kind === "loop" ? 2 : 1.6}
                  strokeDasharray={l.kind === "loop" ? "7 5" : undefined}
                  opacity={dim ? 0.06 : 0.85}
                  markerEnd={`url(#nm-${l.kind})`}
                >
                  {l.label && <title>{l.label}</title>}
                </path>
              );
            })}
          </g>

          {/* 节点 */}
          {nodes.map((n) => {
            const p = layout.pos.get(n.id);
            if (!p) return null;
            const enabled = isActive(n.id);
            const isHub = n.kind === "hub";
            const dim = (active && !neighbors?.has(n.id)) || !enabled;
            const color = routeColor(n.route ?? "");
            return (
              <g
                key={n.id}
                data-node={n.id}
                transform={`translate(${p.x}, ${p.y})`}
                opacity={dim ? 0.16 : 1}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(n.id);
                }}
              >
                <rect
                  width={p.w}
                  height={p.h}
                  rx={isHub ? 10 : 7}
                  fill={isHub ? color : "#ffffff"}
                  fillOpacity={isHub ? 0.12 : 1}
                  stroke={selectedId === n.id ? "#1d4ed8" : isHub ? color : n.key ? "#f59e0b" : "#cbd5e1"}
                  strokeWidth={selectedId === n.id ? 2.4 : isHub ? 2 : n.key ? 1.8 : 1}
                />
                {isHub ? (
                  <>
                    <text x={p.w / 2} y={p.h / 2 - 4} fontSize={14} fontWeight={700} textAnchor="middle" fill="#1f2328">
                      {n.label}
                    </text>
                    <text x={p.w / 2} y={p.h / 2 + 12} fontSize={10} textAnchor="middle" fill="#64748b">
                      点击查看路线详情 · {(n as GraphNode & { item_count?: number }).item_count ?? 0} 个方法节点
                    </text>
                  </>
                ) : (
                  <>
                    <text x={8} y={18} fontSize={11} fontWeight={n.key ? 700 : 500} fill="#1f2328">
                      {n.key && "⭐"}
                      {n.label.length > 13 ? n.label.slice(0, 12) + "…" : n.label}
                    </text>
                    <text x={8} y={34} fontSize={9} fill="#64748b">
                      {n.stage}
                      {n.year ? ` · ${n.year}` : ""}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );

  function zoomBy(factor: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const { k, tx, ty } = view.current;
    const nk = Math.min(2.5, Math.max(0.08, k * factor));
    view.current = {
      k: nk,
      tx: rect.width / 2 - ((rect.width / 2 - tx) / k) * nk,
      ty: rect.height / 2 - ((rect.height / 2 - ty) / k) * nk,
    };
    apply();
  }
}
